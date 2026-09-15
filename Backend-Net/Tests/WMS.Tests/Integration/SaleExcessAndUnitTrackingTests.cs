using Application.Common.Contracts.ProductUnit;
using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;
using SR = Application.Features.SaleReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Excess sent to a customer recorded as a warehouse fact (ShipSale ExcessQuantity), the sale EXCESS claim quota it feeds, and
    /// RequiresUnitTracking making scans mandatory on outbound movements.
    /// </summary>
    public class SaleExcessAndUnitTrackingTests
    {
        private static ShipSaleCommandHandler Ship(TestScope s) => new(s.Db, s.ProductUnitService, s.InventoryCostingService, s.UnitOfWork);
        private static SR.CreateSaleReturnCommandHandler CreateReturn(TestScope s) => new(s.Db, s.SaleReturnRepository, s.SaleReturnCalculation, s.UnitOfWork);

        private static CreateReturnClaimDto ExcessClaim(SaleScenario s, int quantity) => new()
        {
            Scope = ReturnClaimScopeEnum.OFF_ORDER, OffScopeKind = ReturnOffScopeKindEnum.EXCESS, OrderLineId = s.Item.Id, ProductId = s.Product.Id, UnitPrice = s.Item.UnitPrice, Quantity = quantity, Problem = ReturnProblemEnum.OVER_SHIPPED,
        };

        [Fact]
        public async Task ExcessOnAFullyShippedLine_LeavesStockAsSoldExcess_WithNoRevenue()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 3);

            await Ship(scope).Handle(new ShipSaleCommand
            {
                SaleId = s.Sale.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = s.Item.Id, ExcessQuantity = 2 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(5, verify.SaleItems.Single(x => x.Id == s.Item.Id).ShippedQuantity); // excess is not on the order
            Assert.Equal(1, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(2, verify.ProductUnits.Count(u => u.SaleItemId == s.Item.Id && u.Status == ProductUnitStatusEnum.SOLD && u.CustodyReason == UnitCustodyReasonEnum.EXCESS));
            var row = verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.SALE_SHIPPED_EXCESS);
            Assert.Equal(-2, row.QuantityDelta);
            Assert.Equal(0m, row.RevenueDelta);
            Assert.Equal(2, verify.ProductUnitMovements.Count(m => m.Reason == ProductUnitMovementReasonEnum.SALE_SHIPPED_EXCESS));
        }

        [Fact]
        public async Task ExcessClaim_IsCappedByRecordedExcess_AcrossOpenReturns()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 2);

            // Nothing recorded as excess yet: the customer's claim is not accepted.
            await Assert.ThrowsAsync<ValidationCustomException>(() => CreateReturn(scope).Handle(new SR.CreateSaleReturnCommand { SaleId = s.Sale.Id, Claims = new() { ExcessClaim(s, 1) } }, CancellationToken.None));

            await Ship(scope).Handle(new ShipSaleCommand { SaleId = s.Sale.Id, Items = new() { new ShipSaleItemDto { SaleItemId = s.Item.Id, ExcessQuantity = 2 } } }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => CreateReturn(scope).Handle(new SR.CreateSaleReturnCommand { SaleId = s.Sale.Id, Claims = new() { ExcessClaim(s, 3) } }, CancellationToken.None));
            await CreateReturn(scope).Handle(new SR.CreateSaleReturnCommand { SaleId = s.Sale.Id, Claims = new() { ExcessClaim(s, 2) } }, CancellationToken.None);
            await Assert.ThrowsAsync<ValidationCustomException>(() => CreateReturn(scope).Handle(new SR.CreateSaleReturnCommand { SaleId = s.Sale.Id, Claims = new() { ExcessClaim(s, 1) } }, CancellationToken.None));
        }

        [Fact]
        public async Task TrackedProduct_ShipWithoutScanning_IsRefused_ScannedShipSucceeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 0, stock: 0);
            s.Product.RequiresUnitTracking = true;
            s.Product.Stock = 2;
            var units = await scope.ProductUnitService.MintAsync(s.Product, 2, UnitOrigin.None, Movements.Test, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => Ship(scope).Handle(new ShipSaleCommand
            {
                SaleId = s.Sale.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = s.Item.Id, ShippedQuantity = 2 } },
            }, CancellationToken.None));

            await Ship(scope).Handle(new ShipSaleCommand
            {
                SaleId = s.Sale.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = s.Item.Id, ShippedQuantity = 2, ProductUnitBarcodes = units.Select(u => u.Barcode).ToList() } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(2, verify.ProductUnits.Count(u => u.SaleItemId == s.Item.Id && u.CustodyReason == UnitCustodyReasonEnum.ON_ORDER));
        }

        [Fact]
        public async Task TrackedProduct_PurchaseGoodsOutWithoutScanning_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            s.Product.RequiresUnitTracking = true;
            scope.Context.SaveChanges();

            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand { PurchaseId = s.Purchase.Id, Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = s.Item.Id, ArrivedQuantity = 5 } } }, CancellationToken.None);

            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = s.Purchase.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = s.Item.Id, ProductId = s.Product.Id, UnitPrice = s.Item.UnitPrice, Quantity = 1, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);

            await new PR.AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.AddClaimResolutionCommand { ClaimId = scope.Context.PurchaseReturnClaims.Single().Id, Composition = new EffectCompositionDto { Quantity = 1, GoodsOut = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 0 } } } }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => new PR.ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.ExecuteGoodsRoundCommand
                {
                    PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                    Rounds = new() { new GoodsRoundLineDto { EffectId = scope.Context.PurchaseReturnEffects.Single().Id, Quantity = 1, Source = ProductUnitStatusEnum.IN_STOCK } },
                }, CancellationToken.None));
        }
    }
}
