using Application.Common.Contracts.ProductUnit;
using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.PurchaseReturn.Commands;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Two movements of one product inside a single request, before SaveChanges. Unit selection used to
    /// read only saved rows, so a unit changed earlier in the request was picked again and a unit minted
    /// earlier could not be found.
    /// </summary>
    public class InFlightUnitSelectionTests
    {
        private static int InStock(TestDatabase db, int productId)
        {
            using var verify = db.NewContext();
            return verify.ProductUnits.Count(u => u.ProductId == productId && u.Status == ProductUnitStatusEnum.IN_STOCK);
        }

        [Fact]
        public async Task Consume_TwiceForOneProductInOneRequest_PicksDistinctUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);
            await scope.ProductUnitService.MintAsync(scenario.Product, 5, UnitOrigin.None, Movements.Test, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            var first = await scope.ProductUnitService.ConsumeAsync(scenario.Product, 2, null, null, null, Movements.Test, CancellationToken.None);
            var second = await scope.ProductUnitService.ConsumeAsync(scenario.Product, 2, null, null, null, Movements.Test, CancellationToken.None);

            // Before the fix the second call re-selected the first call's units (still IN_STOCK when saved).
            Assert.Empty(first.Select(u => u.Id).Intersect(second.Select(u => u.Id)));

            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);
            using var verify = db.NewContext();
            Assert.Equal(4, verify.ProductUnits.Count(u => u.ProductId == scenario.Product.Id && u.Status == ProductUnitStatusEnum.SOLD));
            Assert.Equal(1, InStock(db, scenario.Product.Id));
        }

        [Fact]
        public async Task Consume_UnitsMintedEarlierInTheSameRequest_CanBeConsumed()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            var minted = await scope.ProductUnitService.MintAsync(scenario.Product, 2, UnitOrigin.None, Movements.Test, CancellationToken.None);

            // Before the fix: no saved IN_STOCK rows, so "not enough units" although two were just minted.
            var consumed = await scope.ProductUnitService.ConsumeAsync(scenario.Product, 2, null, null, null, Movements.Test, CancellationToken.None);
            Assert.Equal(minted.Select(u => u.SerialNumber).OrderBy(s => s), consumed.Select(u => u.SerialNumber).OrderBy(s => s));

            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);
            Assert.Equal(0, InStock(db, scenario.Product.Id));
        }

        [Fact]
        public async Task Consume_ExplicitBarcodeOfAUnitMintedInTheSameRequest_IsFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            var minted = await scope.ProductUnitService.MintAsync(scenario.Product, 1, UnitOrigin.None, Movements.Test, CancellationToken.None);
            var consumed = await scope.ProductUnitService.ConsumeAsync(scenario.Product, 1, null, null, new List<string> { minted[0].Barcode }, Movements.Test, CancellationToken.None);

            Assert.Same(minted[0], Assert.Single(consumed));
            Assert.Equal(ProductUnitStatusEnum.SOLD, minted[0].Status);
        }

        [Fact]
        public async Task ReturnToSupplier_TwiceForOneProductInOneRequest_PicksDistinctUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);
            await scope.ProductUnitService.MintAsync(scenario.Product, 4, new UnitOrigin(PurchaseItemId: scenario.Item.Id), Movements.Test, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            await scope.ProductUnitService.ReturnToSupplierAsync(scenario.Product, 1, UnitSelection.InStock(scenario.Item.Id), null, Movements.Test, CancellationToken.None);
            await scope.ProductUnitService.ReturnToSupplierAsync(scenario.Product, 1, UnitSelection.InStock(scenario.Item.Id), null, Movements.Test, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(2, verify.ProductUnits.Count(u => u.Status == ProductUnitStatusEnum.RETURNED_TO_SUPPLIER));
            Assert.Equal(2, InStock(db, scenario.Product.Id));
        }

        [Fact]
        public async Task Restore_TwiceForOneSaleLineInOneRequest_PicksDistinctUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 3, shippedQuantity: 3, stock: 0);

            await scope.ProductUnitService.RestoreAsync(scenario.Item.Id, false, 1, 0, null, null, Movements.Test, CancellationToken.None);
            await scope.ProductUnitService.RestoreAsync(scenario.Item.Id, false, 1, 0, null, null, Movements.Test, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(2, InStock(db, scenario.Product.Id));
            Assert.Equal(1, verify.ProductUnits.Count(u => u.SaleItemId == scenario.Item.Id && u.Status == ProductUnitStatusEnum.SOLD));
        }

        [Fact]
        public async Task Restore_ThenConsume_InOneRequest_ShipsTheRestoredUnit()
        {
            // A customer's unit comes back and goes straight out again as a replacement, in one request.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 2, shippedQuantity: 2, stock: 0);

            await scope.ProductUnitService.RestoreAsync(scenario.Item.Id, false, 1, 0, null, null, Movements.Test, CancellationToken.None);

            // Before the fix: nothing IN_STOCK when saved, so the restored unit could not be shipped.
            var shipped = await scope.ProductUnitService.ConsumeAsync(scenario.Product, 1, null, null, null, Movements.Test, CancellationToken.None);
            Assert.Single(shipped);

            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);
            using var verify = db.NewContext();
            Assert.Equal(0, InStock(db, scenario.Product.Id));
            Assert.Equal(2, verify.ProductUnits.Count(u => u.ProductId == scenario.Product.Id && u.Status == ProductUnitStatusEnum.SOLD));
        }

        [Fact]
        public async Task ReconcileStock_AfterAMintInTheSameRequest_CountsTheInFlightUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            await scope.ProductUnitService.MintAsync(scenario.Product, 3, UnitOrigin.None, Movements.Test, CancellationToken.None);

            // Stock of 3 is exactly what was just minted; before the fix it saw 0 saved units and minted 3 more.
            await scope.ProductUnitService.ReconcileStockAsync(scenario.Product, 3, Movements.Test, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            Assert.Equal(3, InStock(db, scenario.Product.Id));
        }

        [Fact]
        public async Task PurchaseGoodsRound_TwoGoodsOutLinesForOneProduct_ReturnsTwoDistinctUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1000);

            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 7 } },
                }, CancellationToken.None);

            await new CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new CreatePurchaseReturnCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Claims = new()
                    {
                        new CreateReturnClaimDto
                        {
                            Scope = ReturnClaimScopeEnum.ON_ORDER,
                            OrderLineId = scenario.Item.Id,
                            ProductId = scenario.Product.Id,
                            UnitPrice = 1000,
                            Quantity = 3,
                            Problem = ReturnProblemEnum.DEFECTIVE,
                        },
                    },
                }, CancellationToken.None);

            await new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new AddClaimResolutionCommand
                {
                    ClaimId = scope.Context.PurchaseReturnClaims.Single().Id,
                    Composition = new EffectCompositionDto
                    {
                        Quantity = 2,
                        GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 1000 } },
                        MoneyIn = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 2000 },
                    },
                }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_OUT).Id;

            await new ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ExecuteGoodsRoundCommand
                {
                    PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                    Rounds = new()
                    {
                        new GoodsRoundLineDto { EffectId = effectId, Quantity = 1, Source = ProductUnitStatusEnum.IN_STOCK },
                        new GoodsRoundLineDto { EffectId = effectId, Quantity = 1, Source = ProductUnitStatusEnum.IN_STOCK },
                    },
                }, CancellationToken.None);

            using var verify = db.NewContext();
            // Before the fix both lines returned the same unit: stock went down by 2, one unit left IN_STOCK.
            Assert.Equal(2, verify.ProductUnits.Count(u => u.Status == ProductUnitStatusEnum.RETURNED_TO_SUPPLIER));
            var stock = verify.Products.Single(p => p.Id == scenario.Product.Id).Stock;
            Assert.Equal(5, stock);
            Assert.Equal(stock, InStock(db, scenario.Product.Id)); // Stock == COUNT(IN_STOCK) holds
        }
    }
}
