using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.PurchaseReturn.Commands;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.PurchaseReturn.Queries;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class PurchaseReturnLifecycleTests
    {
        private static async Task<(PurchaseScenario scenario, int claimId)> SeedReceivedWithClaim(TestScope scope, int ordered = 10, int received = 7, int claimQty = 3)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: ordered, stock: 0);

            var receiveHandler = new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await receiveHandler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = received } },
            }, CancellationToken.None);

            var createHandler = new CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await createHandler.Handle(new CreatePurchaseReturnCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Claims = new()
                {
                    new CreateReturnClaimDto
                    {
                        Scope = ReturnClaimScopeEnum.ON_ORDER,
                        OrderLineId = scenario.Item.Id,
                        ProductId = scenario.Product.Id,
                        UnitPrice = scenario.Item.UnitPrice,
                        Quantity = claimQty,
                        Problem = ReturnProblemEnum.DAMAGED_IN_TRANSIT,
                    },
                },
            }, CancellationToken.None);

            var claimId = scope.Context.PurchaseReturnClaims.Single().Id;
            return (scenario, claimId);
        }

        [Fact]
        public async Task CreatePurchaseReturn_OnOrderClaimExceedsReceived_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            var receiveHandler = new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await receiveHandler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 4 } },
            }, CancellationToken.None);

            var createHandler = new CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => createHandler.Handle(new CreatePurchaseReturnCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Claims = new()
                {
                    new CreateReturnClaimDto
                    {
                        Scope = ReturnClaimScopeEnum.ON_ORDER,
                        OrderLineId = scenario.Item.Id,
                        ProductId = scenario.Product.Id,
                        UnitPrice = scenario.Item.UnitPrice,
                        Quantity = 5,
                        Problem = ReturnProblemEnum.DEFECTIVE,
                    },
                },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreatePurchaseReturn_OffScopeExcessClaim_SucceedsWithoutTouchingLineQuota()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            var receiveHandler = new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await receiveHandler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 5 } },
            }, CancellationToken.None);

            var createHandler = new CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await createHandler.Handle(new CreatePurchaseReturnCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Claims = new()
                {
                    new CreateReturnClaimDto
                    {
                        Scope = ReturnClaimScopeEnum.OFF_ORDER,
                        OffScopeKind = ReturnOffScopeKindEnum.EXCESS,
                        ProductId = scenario.Product.Id,
                        UnitPrice = scenario.Item.UnitPrice,
                        Quantity = 3,
                        Problem = ReturnProblemEnum.OVER_SHIPPED,
                    },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var claim = verify.PurchaseReturnClaims.Single();
            Assert.Equal(ReturnClaimScopeEnum.OFF_ORDER, claim.Scope);
            Assert.Null(claim.PurchaseItemId);
        }

        [Fact]
        public async Task AddClaimResolution_MoneyOnly_SettlesImmediatelyAndBumpsSettledQuantity()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope);

            var handler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    Money = new MoneyEffectDto { Kind = ReturnEffectKindEnum.MONEY_IN, Method = ReturnPaymentMethodEnum.CASH, Amount = 3 * scenario.Item.UnitPrice },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id);
            var purchaseReturn = verify.PurchaseReturns.Single();

            Assert.Equal(3, item.SettledQuantity);
            Assert.Equal(ReturnStatusEnum.SETTLED, purchaseReturn.Status);
        }

        [Fact]
        public async Task AddClaimResolution_GoodsInEffect_StaysPendingUntilGoodsRound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope);

            var handler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new GoodsEffectDto { Quantity = 3 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id);
            var purchaseReturn = verify.PurchaseReturns.Single();
            var effect = verify.PurchaseReturnEffects.Single();

            Assert.Equal(0, item.SettledQuantity); // goods effect still pending - nothing settled yet
            Assert.Equal(ReturnEffectStatusEnum.PENDING, effect.Status);
            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, purchaseReturn.Status);
        }

        [Fact]
        public async Task AddClaimResolution_QuantityExceedsRemaining_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope, claimQty: 3);

            var handler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 4, GoodsIn = new GoodsEffectDto { Quantity = 4 } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task ExecuteGoodsRound_CompletesGoodsInEffect_RestocksAndAppliesAndSettles()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new GoodsEffectDto { Quantity = 3 } },
            }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single().Id;
            var stockBefore = scope.Context.Products.Single(x => x.Id == scenario.Product.Id).Stock;
            var purchaseReturnId = scope.Context.PurchaseReturns.Single().Id;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = purchaseReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 3 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);
            var effect = verify.PurchaseReturnEffects.Single();
            var item = verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id);
            var purchaseReturn = verify.PurchaseReturns.Single();

            Assert.Equal(stockBefore + 3, product.Stock);
            Assert.Equal(ReturnEffectStatusEnum.APPLIED, effect.Status);
            Assert.Equal(3, effect.DoneQuantity);
            Assert.Equal(3, item.SettledQuantity);
            Assert.Equal(ReturnStatusEnum.SETTLED, purchaseReturn.Status);
        }

        [Fact]
        public async Task ExecuteGoodsRound_PartialQuantity_LeavesEffectPending()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new GoodsEffectDto { Quantity = 3 } },
            }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single().Id;
            var purchaseReturnId = scope.Context.PurchaseReturns.Single().Id;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = purchaseReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 2 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var effect = verify.PurchaseReturnEffects.Single();

            Assert.Equal(ReturnEffectStatusEnum.PENDING, effect.Status);
            Assert.Equal(2, effect.DoneQuantity);
        }

        [Fact]
        public async Task RemoveClaimResolution_Untouched_Succeeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new GoodsEffectDto { Quantity = 3 } },
            }, CancellationToken.None);

            var resolutionId = scope.Context.PurchaseReturnResolutions.Single().Id;

            var removeHandler = new RemoveClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await removeHandler.Handle(new RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Empty(verify.PurchaseReturnResolutions);
        }

        [Fact]
        public async Task RemoveClaimResolution_AfterGoodsMoved_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new GoodsEffectDto { Quantity = 3 } },
            }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single().Id;
            var resolutionId = scope.Context.PurchaseReturnResolutions.Single().Id;
            var purchaseReturnId = scope.Context.PurchaseReturns.Single().Id;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = purchaseReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 1 } },
            }, CancellationToken.None);

            var removeHandler = new RemoveClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => removeHandler.Handle(new RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None));
        }

        [Fact]
        public async Task CancelPurchaseReturn_Untouched_Succeeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            var handler = new CancelPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(ReturnStatusEnum.CANCELLED, verify.PurchaseReturns.Single().Status);
        }

        [Fact]
        public async Task CancelPurchaseReturn_AfterResolutionApplied_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, Money = new MoneyEffectDto { Kind = ReturnEffectKindEnum.MONEY_IN, Method = ReturnPaymentMethodEnum.CASH, Amount = 300 } },
            }, CancellationToken.None);

            var returnId = scope.Context.PurchaseReturns.Single().Id;
            var handler = new CancelPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None));
        }

        [Fact]
        public async Task RejectThenReopen_GoesBackToOpen()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            var rejectHandler = new RejectPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await rejectHandler.Handle(new RejectPurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using (var verify = db.NewContext())
                Assert.Equal(ReturnStatusEnum.REJECTED, verify.PurchaseReturns.Single().Status);

            using var reopenScope = db.NewScope();
            var reopenHandler = new ReopenPurchaseReturnCommandHandler(reopenScope.Db, reopenScope.PurchaseReturnQueryService, reopenScope.PurchaseReturnCalculation, reopenScope.UnitOfWork);
            await reopenHandler.Handle(new ReopenPurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify2 = db.NewContext();
            Assert.Equal(ReturnStatusEnum.OPEN, verify2.PurchaseReturns.Single().Status);
        }

        [Fact]
        public async Task DeletePurchaseReturn_Untouched_HardDeletesWithCascade()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            var handler = new DeletePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new DeletePurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Empty(verify.PurchaseReturns);
            Assert.Empty(verify.PurchaseReturnClaims);
        }

        [Fact]
        public async Task GetPurchaseReturnDetail_ReflectsFlags()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            using var readScope = db.NewScope();
            var handler = new GetPurchaseReturnDetailQueryHandler(readScope.Db, readScope.PurchaseReturnQueryService, readScope.PurchaseReturnCalculation, FakeObjectStorage.Instance);
            var detail = (PurchaseReturnDetailDto)(await handler.Handle(new GetPurchaseReturnDetailQuery { Id = returnId }, CancellationToken.None)).Data!;

            Assert.True(detail.CanCancel);
            Assert.True(detail.CanReject);
            Assert.True(detail.CanDelete);
            Assert.False(detail.CanReopen);
            Assert.Single(detail.Claims);
        }

        [Fact]
        public async Task GetPurchaseReturnList_FiltersByStatus()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            await SeedReceivedWithClaim(scope);

            var handler = new GetPurchaseReturnListQueryHandler(scope.Db);
            var res = await handler.Handle(new GetPurchaseReturnListQuery { Status = ReturnStatusEnum.OPEN }, CancellationToken.None);

            var list = (System.Collections.IEnumerable)res.Data!.GetType().GetProperty("ReturnList")!.GetValue(res.Data)!;
            Assert.NotEmpty(list.Cast<object>());
        }

        [Fact]
        public async Task GetPurchaseReturnPendingEffects_ListsOnlyPendingGoodsEffects()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnQueryService, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new GoodsEffectDto { Quantity = 3 } },
            }, CancellationToken.None);

            var handler = new GetPurchaseReturnPendingEffectsQueryHandler(scope.Db, scope.PurchaseReturnQueryService);
            var res = await handler.Handle(new GetPurchaseReturnPendingEffectsQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None);

            var list = ((System.Collections.Generic.IEnumerable<PendingEffectDto>)res.Data!.GetType().GetProperty("PendingEffects")!.GetValue(res.Data)!).ToList();
            var pending = Assert.Single(list);
            Assert.Equal(ReturnEffectKindEnum.GOODS_IN, pending.Kind);
        }
    }
}
