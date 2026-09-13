using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.PurchaseReturn.Commands;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Two writes for the same product inside one request, before SaveChanges. The cost ledger's
    /// running totals and the unit serial numbers both used to be read from the newest *saved* row
    /// only, so the second write started from the same base as the first.
    /// </summary>
    public class InFlightLedgerAndSerialTests
    {
        [Fact]
        public async Task Ledger_TwoInboundEntriesForOneProductInOneRequest_ChainTheirRunningTotals()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 20, stock: 0);

            await scope.InventoryCostingService.RecordPurchaseReceiptAsync(scenario.Product, 10, 100, 0, scenario.Item.Id, DateTime.Now, CancellationToken.None);
            await scope.InventoryCostingService.RecordPurchaseReceiptAsync(scenario.Product, 10, 200, 0, scenario.Item.Id, DateTime.Now, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            using var verify = db.NewContext();
            var rows = verify.InventoryCostLedgerEntries.Where(x => x.ProductId == scenario.Product.Id).OrderBy(x => x.Id).ToList();

            Assert.Equal(2, rows.Count);
            Assert.Equal(10, rows[0].RunningQuantity);
            // Before the fix the second row started from nothing: 10 units worth 2,000 at 200.
            Assert.Equal(20, rows[1].RunningQuantity);
            Assert.Equal(3000m, rows[1].RunningInventoryValue);
            Assert.Equal(150m, rows[1].RunningAverageCost);
        }

        [Fact]
        public async Task Ledger_OutboundAfterInboundInOneRequest_ConsumesAtTheInFlightAverage()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            await scope.InventoryCostingService.RecordPurchaseReceiptAsync(scenario.Product, 10, 100, 0, scenario.Item.Id, DateTime.Now, CancellationToken.None);
            await scope.InventoryCostingService.RecordManualAdjustmentOutAsync(scenario.Product, 4, DateTime.Now, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            using var verify = db.NewContext();
            var outbound = verify.InventoryCostLedgerEntries.Where(x => x.ProductId == scenario.Product.Id).OrderBy(x => x.Id).Last();

            // Before the fix there was no average to consume at (0), and the pool went to -4 units.
            Assert.Equal(6, outbound.RunningQuantity);
            Assert.Equal(100m, outbound.UnitCost);
            Assert.Equal(-400m, outbound.InventoryValueDelta);
            Assert.Equal(600m, outbound.RunningInventoryValue);
        }

        [Fact]
        public async Task Serials_TwoMintsForOneProductInOneRequest_AreDistinct_AndTheRequestSaves()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            var first = await scope.ProductUnitService.MintAsync(scenario.Product, 2, null, CancellationToken.None);
            var second = await scope.ProductUnitService.MintAsync(scenario.Product, 3, null, CancellationToken.None);

            Assert.Equal(new[] { 1, 2, 3, 4, 5 }, first.Concat(second).Select(u => u.SerialNumber).ToArray());

            // Before the fix both calls handed out serials starting at 1, and the unique
            // (ProductId, SerialNumber) index failed this save.
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            using var verify = db.NewContext();
            var serials = verify.ProductUnits.Where(u => u.ProductId == scenario.Product.Id).Select(u => u.SerialNumber).ToList();
            Assert.Equal(5, serials.Count);
            Assert.Equal(5, serials.Distinct().Count());
        }

        [Fact]
        public async Task PurchaseGoodsRound_TwoLinesForTheSameProduct_SavesWithDistinctSerials_AndChainedLedger()
        {
            // The same two bugs through a real handler: one goods round, two lines for one product,
            // each line minting units and writing a ledger row before the single SaveChanges.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1000);

            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 7 } },
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
                        Quantity = 3,
                        GoodsIn = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } },
                        MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 },
                    },
                }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).Id;

            await new ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ExecuteGoodsRoundCommand
                {
                    PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                    Rounds = new()
                    {
                        new GoodsRoundLineDto { EffectId = effectId, Quantity = 1 },
                        new GoodsRoundLineDto { EffectId = effectId, Quantity = 2 },
                    },
                }, CancellationToken.None);

            using var verify = db.NewContext();
            var serials = verify.ProductUnits.Where(u => u.ProductId == scenario.Product.Id).Select(u => u.SerialNumber).ToList();
            Assert.Equal(10, serials.Count);
            Assert.Equal(10, serials.Distinct().Count());

            // Inventory rows only: the resolution's MONEY_OUT writes its own revenue row, which moves no quantity.
            var rows = verify.InventoryCostLedgerEntries.Where(x => x.ProductId == scenario.Product.Id && x.QuantityDelta != 0).OrderBy(x => x.Id).ToList();
            Assert.Equal(new[] { 7, 8, 10 }, rows.Select(r => r.RunningQuantity).ToArray());
            Assert.Equal(10, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
        }
    }
}
