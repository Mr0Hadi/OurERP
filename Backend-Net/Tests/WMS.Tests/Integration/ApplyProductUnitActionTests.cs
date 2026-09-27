using Application.Common.Dtos.Returns;
using Application.Features.Product.Commands;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Manual warehouse actions on units, with no purchase return behind them (2026-09-27): take units off the shelf into
    /// quarantine, release them, scrap them - each at the value the unit carries - without stepping on units a purchase-return
    /// decision has reserved.
    /// </summary>
    public class ApplyProductUnitActionTests
    {
        private static ApplyProductUnitActionCommandHandler Handler(TestScope s) =>
            new(s.Db, s.ProductUnitService, s.InventoryCostingService, s.PurchaseReturnCalculation, s.UnitOfWork);

        private static Task Act(TestScope scope, ProductUnitActionEnum action, IEnumerable<int> unitIds, UnitActionReasonEnum reason = UnitActionReasonEnum.DEFECT_FOUND, string? note = "یادداشت") =>
            Handler(scope).Handle(new ApplyProductUnitActionCommand { Action = action, ProductUnitIds = unitIds.ToList(), Reason = reason, Note = note }, CancellationToken.None);

        /// <summary>Ordered 10 at 1,000; <paramref name="arrived"/> arrived, <paramref name="defective"/> of them defective.</summary>
        private static async Task<PurchaseScenario> Received(TestScope scope, int arrived = 10, int defective = 0)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1000);
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new()
                    {
                        new ReceivePurchaseItemDto
                        {
                            PurchaseItemId = scenario.Item.Id,
                            ArrivedQuantity = arrived,
                            Defects = defective > 0 ? new() { new ReceivingDefectDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = defective } } : new(),
                        },
                    },
                }, CancellationToken.None);
            return scenario;
        }

        private static List<int> UnitIds(TestScope scope, PurchaseScenario s, ProductUnitStatusEnum status, int take) =>
            scope.Context.ProductUnits.Where(u => u.ProductId == s.Product.Id && u.Status == status).OrderBy(u => u.SerialNumber).Take(take).Select(u => u.Id).ToList();

        [Fact]
        public async Task Quarantine_ThenRelease_MovesStockAndValue_AndBackToZero()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope);
            var ids = UnitIds(scope, s, ProductUnitStatusEnum.IN_STOCK, 2);

            await Act(scope, ProductUnitActionEnum.QUARANTINE, ids, UnitActionReasonEnum.NEEDS_INSPECTION, null);

            using (var verify = db.NewContext())
            {
                Assert.Equal(8, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
                var held = verify.ProductUnits.Where(u => ids.Contains(u.Id)).ToList();
                Assert.All(held, u => Assert.Equal((ProductUnitStatusEnum.QUARANTINED, (UnitCustodyReasonEnum?)UnitCustodyReasonEnum.WAREHOUSE_HOLD, (decimal?)1_000m, (int?)s.Item.Id),
                    (u.Status, u.CustodyReason, u.QuarantineCost, u.PurchaseItemId)));
                var row = verify.InventoryCostLedgerEntries.Single(e => e.EventType == InventoryCostEventTypeEnum.STOCK_QUARANTINED);
                Assert.Equal((-2_000m, 2_000m), (row.InventoryValueDelta, row.OffPoolValueDelta));
                var moves = verify.ProductUnitMovements.Where(m => m.Reason == ProductUnitMovementReasonEnum.STOCK_QUARANTINED).ToList();
                Assert.Equal(2, moves.Count);
                Assert.All(moves, m => Assert.Equal(UnitActionReasonEnum.NEEDS_INSPECTION, m.ActionReason));
            }

            await Act(scope, ProductUnitActionEnum.RELEASE, ids, UnitActionReasonEnum.INSPECTION_PASSED, null);

            using var after = db.NewContext();
            Assert.Equal(10, after.Products.Single(p => p.Id == s.Product.Id).Stock);
            var ledger = after.InventoryCostLedgerEntries.Where(e => e.ProductId == s.Product.Id).OrderBy(e => e.Id).ToList();
            Assert.Equal(0m, ledger.Sum(e => e.OffPoolValueDelta));
            Assert.Equal((10, 10_000m), (ledger.Last().RunningQuantity, ledger.Last().RunningInventoryValue));
        }

        [Fact]
        public async Task Scrap_FromShelfAndFromQuarantine_EachAtItsOwnValue()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, arrived: 10, defective: 2); // 8 on the shelf, 2 defective in quarantine at 1,000
            var ids = UnitIds(scope, s, ProductUnitStatusEnum.IN_STOCK, 1).Concat(UnitIds(scope, s, ProductUnitStatusEnum.QUARANTINED, 1)).ToList();

            await Act(scope, ProductUnitActionEnum.SCRAP, ids, UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE, "افتاد و شکست");

            using var verify = db.NewContext();
            Assert.Equal(7, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(2, verify.ProductUnits.Count(u => ids.Contains(u.Id) && u.Status == ProductUnitStatusEnum.SCRAPPED));
            Assert.Equal(-1_000m, verify.InventoryCostLedgerEntries.Single(e => e.EventType == InventoryCostEventTypeEnum.STOCK_SCRAPPED).InventoryValueDelta);
            Assert.Equal(-1_000m, verify.InventoryCostLedgerEntries.Single(e => e.EventType == InventoryCostEventTypeEnum.QUARANTINE_SCRAPPED).OffPoolValueDelta);
        }

        [Fact]
        public async Task WrongStatus_IsRefused_AndNothingMoves()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope);
            var ids = UnitIds(scope, s, ProductUnitStatusEnum.IN_STOCK, 2);

            await Assert.ThrowsAsync<ValidationCustomException>(() => Act(scope, ProductUnitActionEnum.RELEASE, ids));

            using var verify = db.NewContext();
            Assert.Equal(10, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(10, verify.ProductUnits.Count(u => u.ProductId == s.Product.Id && u.Status == ProductUnitStatusEnum.IN_STOCK));
        }

        [Fact]
        public async Task UnitsReservedByAPurchaseReturnDecision_CannotBeReleased()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, arrived: 10, defective: 3); // 3 defective in quarantine on the line

            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = s.Purchase.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = s.Item.Id, ProductId = s.Product.Id, UnitPrice = 1000, Quantity = 2, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);
            await new PR.AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.AddClaimResolutionCommand
                {
                    ClaimId = scope.Context.PurchaseReturnClaims.Single().Id,
                    Composition = new EffectCompositionDto { Quantity = 2, GoodsOut = new() { new GoodsEffectDto { Quantity = 2, Source = ProductUnitStatusEnum.QUARANTINED } } },
                }, CancellationToken.None);

            var quarantined = UnitIds(scope, s, ProductUnitStatusEnum.QUARANTINED, 3);
            await Assert.ThrowsAsync<ValidationCustomException>(() => Act(scope, ProductUnitActionEnum.RELEASE, quarantined.Take(2)));
            await Act(scope, ProductUnitActionEnum.RELEASE, quarantined.Take(1));

            using var verify = db.NewContext();
            Assert.Equal(8, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(2, verify.ProductUnits.Count(u => u.ProductId == s.Product.Id && u.Status == ProductUnitStatusEnum.QUARANTINED));
        }

        [Fact]
        public async Task UnpaidExcess_NeedsANote_AndThenIsFreeStockAtZero()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, arrived: 12); // 2 excess, unpaid, held at 0
            var excess = UnitIds(scope, s, ProductUnitStatusEnum.QUARANTINED, 2);

            await Assert.ThrowsAsync<ValidationCustomException>(() => Act(scope, ProductUnitActionEnum.RELEASE, excess, UnitActionReasonEnum.INSPECTION_PASSED, null));
            await Act(scope, ProductUnitActionEnum.RELEASE, excess, UnitActionReasonEnum.INSPECTION_PASSED, "تامین‌کننده رایگان داد");

            using var verify = db.NewContext();
            Assert.Equal(12, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            var last = verify.InventoryCostLedgerEntries.Where(e => e.ProductId == s.Product.Id).OrderBy(e => e.Id).Last();
            Assert.Equal((12, 10_000m), (last.RunningQuantity, last.RunningInventoryValue)); // free goods dilute the average
        }

        [Fact]
        public async Task WarehouseHold_CanGoBackToTheSupplier_OnItsLine()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope);
            var held = UnitIds(scope, s, ProductUnitStatusEnum.IN_STOCK, 1);
            await Act(scope, ProductUnitActionEnum.QUARANTINE, held, UnitActionReasonEnum.DEFECT_FOUND, null);

            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = s.Purchase.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = s.Item.Id, ProductId = s.Product.Id, UnitPrice = 1000, Quantity = 1, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);
            await new PR.AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.AddClaimResolutionCommand
                {
                    ClaimId = scope.Context.PurchaseReturnClaims.Single().Id,
                    Composition = new EffectCompositionDto { Quantity = 1, GoodsOut = new() { new GoodsEffectDto { Quantity = 1, Source = ProductUnitStatusEnum.QUARANTINED } } },
                }, CancellationToken.None);
            await new PR.ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.ExecuteGoodsRoundCommand
                {
                    PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                    Rounds = new() { new GoodsRoundLineDto { EffectId = scope.Context.PurchaseReturnEffects.Single().Id, Quantity = 1 } },
                }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(ProductUnitStatusEnum.RETURNED_TO_SUPPLIER, verify.ProductUnits.Single(u => u.Id == held[0]).Status);
            Assert.Equal(0m, verify.InventoryCostLedgerEntries.Where(e => e.ProductId == s.Product.Id).Sum(e => e.OffPoolValueDelta));
        }

        [Fact]
        public void Validator_ScrapNeedsANote_AndUnitsAreDistinct()
        {
            var sut = new ApplyProductUnitActionCommandValidator();
            Assert.False(sut.Validate(new ApplyProductUnitActionCommand { Action = ProductUnitActionEnum.SCRAP, Reason = UnitActionReasonEnum.DEFECT_FOUND, ProductUnitIds = new() { 1 } }).IsValid);
            Assert.False(sut.Validate(new ApplyProductUnitActionCommand { Action = ProductUnitActionEnum.RELEASE, Reason = UnitActionReasonEnum.OTHER, ProductUnitIds = new() { 1 } }).IsValid);
            Assert.False(sut.Validate(new ApplyProductUnitActionCommand { Action = ProductUnitActionEnum.RELEASE, Reason = UnitActionReasonEnum.INSPECTION_PASSED, ProductUnitIds = new() { 1, 1 } }).IsValid);
            Assert.True(sut.Validate(new ApplyProductUnitActionCommand { Action = ProductUnitActionEnum.QUARANTINE, Reason = UnitActionReasonEnum.NEEDS_INSPECTION, ProductUnitIds = new() { 1, 2 } }).IsValid);
        }
    }
}
