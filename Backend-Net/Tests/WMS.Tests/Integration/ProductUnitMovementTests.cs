using Application.Common.Contracts.ProductUnit;
using Application.Common.Dtos.Returns;
using Application.Common.Returns;
using Application.Features.Product.Dtos;
using Application.Features.Product.Queries;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;
using SR = Application.Features.SaleReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// The ProductUnitMovement ledger (every unit change leaves a row with its document and counterparty), the
    /// unit history query built on it, and scanned barcodes on goods rounds.
    /// </summary>
    public class ProductUnitMovementTests
    {
        private static async Task<PurchaseScenario> ReceivedPurchase(TestScope scope, int received)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = received } },
                }, CancellationToken.None);

            return scenario;
        }

        [Fact]
        public async Task ReceivePurchase_WritesOneCreationMovementPerUnit_WithDocumentAndSupplier()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await ReceivedPurchase(scope, received: 3);

            using var verify = db.NewContext();
            var movements = verify.ProductUnitMovements.ToList();

            Assert.Equal(3, movements.Count);
            Assert.All(movements, m =>
            {
                Assert.Null(m.FromStatus);
                Assert.Equal(ProductUnitStatusEnum.IN_STOCK, m.ToStatus);
                Assert.Equal(ProductUnitMovementReasonEnum.PURCHASE_RECEIVED, m.Reason);
                Assert.Equal(DocumentKindEnum.PURCHASE, m.DocumentKind);
                Assert.Equal(scenario.Purchase.Id, m.DocumentId);
                Assert.Equal(scenario.Purchase.SupplierId, m.SupplierId);
                Assert.Equal(scenario.Item.Id, m.PurchaseItemId);
                Assert.Equal(1, m.UserId);
            });
            Assert.Equal(3, verify.ProductUnitMovements.Select(m => m.ProductUnitId).Distinct().Count());
        }

        [Fact]
        public async Task GetProductUnitHistory_ByBarcode_ReturnsOriginAndEveryMovementInOrder()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await ReceivedPurchase(scope, received: 2);

            var unit = scope.Context.ProductUnits.OrderBy(u => u.SerialNumber).First();
            await scope.ProductUnitService.ConsumeAsync(scenario.Product, 1, null, null, new List<string> { unit.Barcode },
                new UnitMovementContext(ProductUnitMovementReasonEnum.SALE_SHIPPED, DateTime.Now.AddMinutes(1), Note: "ارسال آزمایشی"), CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            var res = await new GetProductUnitHistoryQueryHandler(scope.Db, scope.ProductCodeService)
                .Handle(new GetProductUnitHistoryQuery { Barcode = unit.Barcode }, CancellationToken.None);

            var history = Assert.IsType<ProductUnitHistoryDto>(res.Data);
            Assert.Equal(unit.Id, history.Unit.Id);
            Assert.Equal(ProductUnitStatusEnum.SOLD, history.Unit.Status);
            Assert.Equal(scenario.Purchase.Id, history.Unit.PurchaseId);
            Assert.Equal(scenario.Purchase.InvoiceNumber, history.Unit.PurchaseInvoiceNumber);
            Assert.NotNull(history.Unit.SupplierName);

            Assert.Equal(2, history.Movements.Count);
            Assert.Equal(ProductUnitMovementReasonEnum.PURCHASE_RECEIVED, history.Movements[0].Reason);
            Assert.Equal(scenario.Purchase.InvoiceNumber, history.Movements[0].DocumentNumber);
            Assert.Equal(history.Unit.SupplierName, history.Movements[0].SupplierName);
            Assert.Equal(ProductUnitStatusEnum.IN_STOCK, history.Movements[1].FromStatus);
            Assert.Equal(ProductUnitStatusEnum.SOLD, history.Movements[1].ToStatus);
            Assert.Equal("ارسال آزمایشی", history.Movements[1].Note);
        }

        [Fact]
        public async Task PurchaseReturnGoodsOut_WithScannedBarcodes_ReturnsExactlyThoseUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await ReceivedPurchase(scope, received: 6);

            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 2, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);

            await new PR.AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.AddClaimResolutionCommand
                {
                    ClaimId = scope.Context.PurchaseReturnClaims.Single().Id,
                    Composition = new EffectCompositionDto { Quantity = 2, GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 0 } } },
                }, CancellationToken.None);

            // The two newest units, so FIFO would have picked different ones.
            var scanned = scope.Context.ProductUnits.OrderByDescending(u => u.SerialNumber).Take(2).ToList();

            await new PR.ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.ExecuteGoodsRoundCommand
                {
                    PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                    Rounds = new() { new GoodsRoundLineDto { EffectId = scope.Context.PurchaseReturnEffects.Single().Id, Quantity = 2, Source = ProductUnitStatusEnum.IN_STOCK, ProductUnitBarcodes = scanned.Select(u => u.Barcode).ToList() } },
                }, CancellationToken.None);

            using var verify = db.NewContext();
            var returnedIds = verify.ProductUnits.Where(u => u.Status == ProductUnitStatusEnum.RETURNED_TO_SUPPLIER).Select(u => u.Id).OrderBy(x => x).ToList();
            Assert.Equal(scanned.Select(u => u.Id).OrderBy(x => x).ToList(), returnedIds);

            var outMovements = verify.ProductUnitMovements.Where(m => m.Reason == ProductUnitMovementReasonEnum.PURCHASE_RETURN_SHIPPED).ToList();
            Assert.Equal(2, outMovements.Count);
            Assert.All(outMovements, m => Assert.Equal(DocumentKindEnum.PURCHASE_RETURN, m.DocumentKind));
        }

        [Fact]
        public async Task PurchaseReturnGoodsIn_WithBarcodes_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await ReceivedPurchase(scope, received: 3);

            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 1, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);

            await new PR.AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.AddClaimResolutionCommand
                {
                    ClaimId = scope.Context.PurchaseReturnClaims.Single().Id,
                    Composition = new EffectCompositionDto { Quantity = 1, GoodsIn = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 0 } } },
                }, CancellationToken.None);

            var anyBarcode = scope.Context.ProductUnits.First().Barcode;

            await Assert.ThrowsAsync<ValidationCustomException>(() => new PR.ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.ExecuteGoodsRoundCommand
                {
                    PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                    Rounds = new() { new GoodsRoundLineDto { EffectId = scope.Context.PurchaseReturnEffects.Single().Id, Quantity = 1, ProductUnitBarcodes = new() { anyBarcode } } },
                }, CancellationToken.None));
        }

        [Fact]
        public async Task SaleReturnGoodsIn_WithScannedBarcodes_ScrapsExactlyTheObservedUnit()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 10, shippedQuantity: 10, stock: 0);

            // Seeded SOLD units are not scannable (non-digit payloads), so ship two real ones on the same line.
            await scope.ProductUnitService.MintAsync(scenario.Product, 2, UnitOrigin.None, Movements.Test, CancellationToken.None);
            var sold = await scope.ProductUnitService.ConsumeAsync(scenario.Product, 2, scenario.Item.Id, null, null, Movements.Test, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            await new SR.CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork)
                .Handle(new SR.CreateSaleReturnCommand
                {
                    SaleId = scenario.Sale.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 2, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);

            await new SR.AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork)
                .Handle(new SR.AddClaimResolutionCommand
                {
                    ClaimId = scope.Context.SaleReturnClaims.Single().Id,
                    Composition = new EffectCompositionDto { Quantity = 2, GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 0 } } },
                }, CancellationToken.None);

            var healthyUnit = sold[0];
            var defectiveUnit = sold[1];

            await new SR.ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork)
                .Handle(new SR.ExecuteGoodsRoundCommand
                {
                    SaleReturnId = scope.Context.SaleReturns.Single().Id,
                    Rounds = new()
                    {
                        new GoodsRoundLineDto
                        {
                            EffectId = scope.Context.SaleReturnEffects.Single().Id,
                            Quantity = 2,
                            ProductUnitBarcodes = new() { healthyUnit.Barcode, defectiveUnit.Barcode },
                            Observations = new() { new GoodsRoundObservationDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = 1, ProductUnitBarcodes = new() { defectiveUnit.Barcode } } },
                        },
                    },
                }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(ProductUnitStatusEnum.IN_STOCK, verify.ProductUnits.Single(u => u.Id == healthyUnit.Id).Status);
            Assert.Equal(ProductUnitStatusEnum.SCRAPPED, verify.ProductUnits.Single(u => u.Id == defectiveUnit.Id).Status);

            var back = verify.ProductUnitMovements.Where(m => m.Reason == ProductUnitMovementReasonEnum.SALE_RETURN_RECEIVED).ToList();
            Assert.Equal(2, back.Count);
            Assert.All(back, m =>
            {
                Assert.Equal(scenario.Sale.CustomerId, m.CustomerId);
                Assert.Equal(ProductUnitStatusEnum.SOLD, m.FromStatus);
                Assert.Equal(scenario.Item.Id, m.SaleItemId);
            });
        }

        [Theory]
        [InlineData(new[] { "A", "B" }, 2, null, 0, true)]
        [InlineData(new[] { "A" }, 2, null, 0, false)]           // line barcodes must number Quantity
        [InlineData(new string[0], 2, new[] { "A" }, 1, false)]  // observation barcodes need line barcodes
        [InlineData(new[] { "A", "B" }, 2, null, 1, false)]      // a scanned line's observation must name its units
        [InlineData(new[] { "A", "B" }, 2, new[] { "B" }, 1, true)]
        public void GoodsRoundBarcodes_CountsMatch(string[] lineBarcodes, int quantity, string[]? observationBarcodes, int observationQuantity, bool expected)
        {
            var line = new GoodsRoundLineDto
            {
                Quantity = quantity,
                ProductUnitBarcodes = lineBarcodes.ToList(),
                Observations = observationQuantity > 0 || observationBarcodes != null
                    ? new() { new GoodsRoundObservationDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = observationQuantity, ProductUnitBarcodes = observationBarcodes?.ToList() } }
                    : new(),
            };

            Assert.Equal(expected, GoodsRoundBarcodes.CountsMatch(line));
        }
    }
}
