using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;
using PRQ = Application.Features.PurchaseReturn.Queries;
using PRD = Application.Features.PurchaseReturn.Dtos;
using SR = Application.Features.SaleReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// A money effect sent without PaidAt is a promise: PENDING, no ledger row, keeps the return IN_PROGRESS,
    /// does not lock the lifecycle, and is executed later by ExecuteMoneyEffectCommand.
    /// </summary>
    public class PendingMoneyEffectTests
    {
        private static async Task<(PurchaseScenario scenario, int claimId)> SeedPurchaseClaim(TestScope scope)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 7 } },
                }, CancellationToken.None);

            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 3, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);

            return (scenario, scope.Context.PurchaseReturnClaims.Single().Id);
        }

        private static PR.AddClaimResolutionCommandHandler PurchaseAdd(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

        private static PR.ExecuteMoneyEffectCommandHandler PurchaseExecute(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

        private static int PurchaseMoneyRows(TestDatabase db)
        {
            using var verify = db.NewContext();
            return verify.InventoryCostLedgerEntries.Count(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_IN || x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_OUT);
        }

        [Fact]
        public async Task Purchase_MoneyWithoutPaidAt_IsPendingWithNoLedgerRowAndKeepsReturnInProgress()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedPurchaseClaim(scope);

            await PurchaseAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var effect = verify.PurchaseReturnEffects.Single();
            Assert.Equal(ReturnEffectStatusEnum.PENDING, effect.Status);
            Assert.Null(effect.AppliedAt);
            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, verify.PurchaseReturns.Single().Status);
            Assert.Equal(0, verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);
            Assert.Equal(0, PurchaseMoneyRows(db));
        }

        [Fact]
        public async Task Purchase_ExecuteMoneyEffect_AppliesWritesLedgerAtPaidAtAndSettles()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedPurchaseClaim(scope);

            await PurchaseAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single().Id;
            var paidAt = new DateTime(2026, 9, 1, 10, 0, 0);

            await PurchaseExecute(scope).Handle(new PR.ExecuteMoneyEffectCommand { EffectId = effectId, PaidAt = paidAt, Reference = "TR-1" }, CancellationToken.None);

            using var verify = db.NewContext();
            var effect = verify.PurchaseReturnEffects.Single();
            Assert.Equal(ReturnEffectStatusEnum.APPLIED, effect.Status);
            Assert.Equal(paidAt, effect.AppliedAt);
            Assert.Equal("TR-1", effect.Reference);
            Assert.Equal(ReturnStatusEnum.SETTLED, verify.PurchaseReturns.Single().Status);
            Assert.Equal(3, verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);

            var row = verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_IN);
            Assert.Equal(paidAt, row.OccurredAt);
            Assert.Equal(3000m, row.RevenueDelta);
        }

        [Fact]
        public async Task Purchase_ExecuteMoneyEffect_Twice_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedPurchaseClaim(scope);

            await PurchaseAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single().Id;
            await PurchaseExecute(scope).Handle(new PR.ExecuteMoneyEffectCommand { EffectId = effectId }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => PurchaseExecute(scope).Handle(new PR.ExecuteMoneyEffectCommand { EffectId = effectId }, CancellationToken.None));
            Assert.Equal(1, PurchaseMoneyRows(db));
        }

        [Fact]
        public async Task Purchase_ExecuteMoneyEffect_OnGoodsEffect_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedPurchaseClaim(scope);

            await PurchaseAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsOut = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 0 } } },
            }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single().Id;
            await Assert.ThrowsAsync<ValidationCustomException>(() => PurchaseExecute(scope).Handle(new PR.ExecuteMoneyEffectCommand { EffectId = effectId }, CancellationToken.None));
        }

        [Fact]
        public async Task Purchase_PendingMoney_DoesNotLockCancel_ButAppliedMoneyDoes()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedPurchaseClaim(scope);

            await PurchaseAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 1, MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 1000 } },
            }, CancellationToken.None);

            var purchaseReturn = scope.Context.PurchaseReturns.Single();
            Assert.Null(scope.PurchaseReturnCalculation.GetLifecycleBlocker(purchaseReturn, Application.Common.Enums.ReturnLifecycleActionEnum.CANCEL));

            await PurchaseExecute(scope).Handle(new PR.ExecuteMoneyEffectCommand { EffectId = scope.Context.PurchaseReturnEffects.Single().Id }, CancellationToken.None);

            var returnId = purchaseReturn.Id;
            using var cancelScope = db.NewScope();
            var cancel = new PR.CancelPurchaseReturnCommandHandler(cancelScope.Db, cancelScope.PurchaseReturnCalculation, FakeObjectStorage.Instance, cancelScope.UnitOfWork);
            await Assert.ThrowsAsync<ValidationCustomException>(() => cancel.Handle(new PR.CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None));
        }

        [Fact]
        public async Task Purchase_RemoveResolutionWithPendingMoney_WritesNoReversal()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedPurchaseClaim(scope);

            await PurchaseAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            var resolutionId = scope.Context.PurchaseReturnResolutions.Single().Id;
            await new PR.RemoveClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None);

            Assert.Equal(0, PurchaseMoneyRows(db));
        }

        [Fact]
        public async Task Purchase_GoodsFinishFirst_MoneyExecutedLater_SettlesOnlyOnce()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedPurchaseClaim(scope);

            await PurchaseAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    GoodsOut = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } },
                    MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 },
                },
            }, CancellationToken.None);

            var goodsId = scope.Context.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_OUT).Id;
            var moneyId = scope.Context.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.MONEY_IN).Id;
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            // The pending money effect must not appear on the warehouse queue.
            var pendingRes = await new PRQ.GetPurchaseReturnPendingEffectsQueryHandler(scope.Db).Handle(new PRQ.GetPurchaseReturnPendingEffectsQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None);
            var pending = ((IEnumerable<PRD.PendingEffectDto>)pendingRes.Data!.GetType().GetProperty("PendingEffects")!.GetValue(pendingRes.Data)!).ToList();
            Assert.Equal(goodsId, Assert.Single(pending).EffectId);

            await new PR.ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.ExecuteGoodsRoundCommand { PurchaseReturnId = returnId, Rounds = new() { new GoodsRoundLineDto { EffectId = goodsId, Quantity = 3, Source = ProductUnitStatusEnum.IN_STOCK } } }, CancellationToken.None);

            using (var verify = db.NewContext())
            {
                Assert.Equal(0, verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);
                Assert.Equal(ReturnStatusEnum.IN_PROGRESS, verify.PurchaseReturns.Single().Status);
            }

            await PurchaseExecute(scope).Handle(new PR.ExecuteMoneyEffectCommand { EffectId = moneyId }, CancellationToken.None);

            using var after = db.NewContext();
            Assert.Equal(3, after.PurchaseItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);
            Assert.Equal(ReturnStatusEnum.SETTLED, after.PurchaseReturns.Single().Status);
        }

        // ─── Sale side ────────────────────────────────────────────────────────────────────────

        private static async Task<(SaleScenario scenario, int claimId)> SeedSaleClaim(TestScope scope)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 10, shippedQuantity: 10, stock: 0);

            await new SR.CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork)
                .Handle(new SR.CreateSaleReturnCommand
                {
                    SaleId = scenario.Sale.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 5, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);

            return (scenario, scope.Context.SaleReturnClaims.Single().Id);
        }

        [Fact]
        public async Task Sale_PendingRefund_ThenExecute_WritesRefundRowAndSettles()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedSaleClaim(scope);

            await new SR.AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork)
                .Handle(new SR.AddClaimResolutionCommand
                {
                    ClaimId = claimId,
                    Composition = new EffectCompositionDto { Quantity = 5, MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 500 } },
                }, CancellationToken.None);

            using (var verify = db.NewContext())
            {
                Assert.Equal(ReturnEffectStatusEnum.PENDING, verify.SaleReturnEffects.Single().Status);
                Assert.Equal(ReturnStatusEnum.IN_PROGRESS, verify.SaleReturns.Single().Status);
                Assert.DoesNotContain(verify.InventoryCostLedgerEntries, x => x.EventType == InventoryCostEventTypeEnum.SALE_RETURN_REFUND);
            }

            var saleReturn = scope.Context.SaleReturns.Single();
            Assert.Null(scope.SaleReturnCalculation.GetLifecycleBlocker(saleReturn, Application.Common.Enums.ReturnLifecycleActionEnum.CANCEL));

            await new SR.ExecuteMoneyEffectCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork)
                .Handle(new SR.ExecuteMoneyEffectCommand { EffectId = scope.Context.SaleReturnEffects.Single().Id }, CancellationToken.None);

            using var after = db.NewContext();
            Assert.Equal(ReturnEffectStatusEnum.APPLIED, after.SaleReturnEffects.Single().Status);
            Assert.Equal(ReturnStatusEnum.SETTLED, after.SaleReturns.Single().Status);
            Assert.Equal(5, after.SaleItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);
            Assert.Equal(-500m, after.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.SALE_RETURN_REFUND).RevenueDelta);
        }
    }
}
