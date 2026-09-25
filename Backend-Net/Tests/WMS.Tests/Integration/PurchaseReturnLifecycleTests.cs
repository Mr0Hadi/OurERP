using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.PurchaseReturn.Commands;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.PurchaseReturn.Queries;
using Common.Exceptions;
using Domain.Enums;
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
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = received } },
            }, CancellationToken.None);

            var createHandler = new CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork);
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
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 4 } },
            }, CancellationToken.None);

            var createHandler = new CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork);

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
        public async Task CreatePurchaseReturn_OnOrderClaimProductDiffersFromLine_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            var otherProduct = Seed.Product(scenario.Product.ProductCategory!, name: "کالای دوم");
            scope.Context.Products.Add(otherProduct);
            scope.Context.SaveChanges();

            var receiveHandler = new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await receiveHandler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 5 } },
            }, CancellationToken.None);

            var createHandler = new CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork);

            // Quantity is within the line's quota, so only the product check can reject it.
            await Assert.ThrowsAsync<ValidationCustomException>(() => createHandler.Handle(new CreatePurchaseReturnCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Claims = new()
                {
                    new CreateReturnClaimDto
                    {
                        Scope = ReturnClaimScopeEnum.ON_ORDER,
                        OrderLineId = scenario.Item.Id,
                        ProductId = otherProduct.Id,
                        UnitPrice = scenario.Item.UnitPrice,
                        Quantity = 1,
                        Problem = ReturnProblemEnum.DEFECTIVE,
                    },
                },
            }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Empty(verify.PurchaseReturns);
        }

        [Fact]
        public async Task AddClaimResolution_MoneyOnly_SettlesImmediatelyAndBumpsSettledQuantity()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope);

            var handler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await handler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    MoneyIn = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3 * scenario.Item.UnitPrice },
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

            var handler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await handler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id);
            var purchaseReturn = verify.PurchaseReturns.Single();
            var effect = verify.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN);

            Assert.Equal(0, item.SettledQuantity); // goods effect still pending - nothing settled yet
            Assert.Equal(ReturnEffectStatusEnum.PENDING, effect.Status);
            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, purchaseReturn.Status);
        }

        [Fact]
        public async Task AddClaimResolution_MultipleGoodsInProducts_ProducesOneEffectPerProduct()
        {
            // A replacement split across two different products - the claim's own product plus one
            // explicitly overridden - registered in a single resolution.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope);

            var otherProduct = Seed.Product(scenario.Product.ProductCategory!, name: "کالای دوم");
            scope.Context.Products.Add(otherProduct);
            scope.Context.SaveChanges();

            var handler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await handler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    GoodsIn = new()
                    {
                        new GoodsEffectDto { Quantity = 2, UnitPrice = 1000 },
                        new GoodsEffectDto { Quantity = 1, ProductId = otherProduct.Id, UnitPrice = scenario.Item.UnitPrice },
                    },
                    MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3 * scenario.Item.UnitPrice },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var effects = verify.PurchaseReturnEffects.Where(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).ToList();

            Assert.Equal(2, effects.Count);
            Assert.Contains(effects, e => e.ProductId == scenario.Product.Id && e.Quantity == 2);
            Assert.Contains(effects, e => e.ProductId == otherProduct.Id && e.Quantity == 1);
            Assert.All(effects, e => Assert.Equal(ReturnEffectDirectionEnum.GOODS_IN, e.Direction));
        }

        [Fact]
        public async Task AddClaimResolution_QuantityExceedsRemaining_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope, claimQty: 3);

            var handler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 4, GoodsIn = new() { new GoodsEffectDto { Quantity = 4, UnitPrice = 1000 } } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task ExecuteGoodsRound_CompletesGoodsInEffect_RestocksAndAppliesAndSettles()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).Id;
            var stockBefore = scope.Context.Products.Single(x => x.Id == scenario.Product.Id).Stock;
            var purchaseReturnId = scope.Context.PurchaseReturns.Single().Id;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = purchaseReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 3 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);
            var effect = verify.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN);
            var item = verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id);
            var purchaseReturn = verify.PurchaseReturns.Single();

            Assert.Equal(stockBefore + 3, product.Stock);
            Assert.Equal(ReturnEffectStatusEnum.APPLIED, effect.Status);
            Assert.Equal(3, effect.AppliedQuantity);
            Assert.Equal(3, item.SettledQuantity);
            Assert.Equal(ReturnStatusEnum.SETTLED, purchaseReturn.Status);
        }

        [Fact]
        public async Task ExecuteGoodsRound_PartialQuantity_LeavesEffectPending()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).Id;
            var purchaseReturnId = scope.Context.PurchaseReturns.Single().Id;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = purchaseReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 2 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var effect = verify.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN);

            Assert.Equal(ReturnEffectStatusEnum.PENDING, effect.Status);
            Assert.Equal(2, effect.AppliedQuantity);
        }

        [Fact]
        public async Task RemoveClaimResolution_Untouched_Succeeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            var resolutionId = scope.Context.PurchaseReturnResolutions.Single().Id;

            var removeHandler = new RemoveClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
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

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).Id;
            var resolutionId = scope.Context.PurchaseReturnResolutions.Single().Id;
            var purchaseReturnId = scope.Context.PurchaseReturns.Single().Id;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = purchaseReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 1 } },
            }, CancellationToken.None);

            var removeHandler = new RemoveClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => removeHandler.Handle(new RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None));
        }

        [Fact]
        public async Task CancelPurchaseReturn_Untouched_Succeeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            var handler = new CancelPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork);
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

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, MoneyIn = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 300 } },
            }, CancellationToken.None);

            var returnId = scope.Context.PurchaseReturns.Single().Id;
            var handler = new CancelPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None));
        }

        [Fact]
        public async Task RejectThenReopen_GoesBackToOpen()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            var rejectHandler = new RejectPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork);
            await rejectHandler.Handle(new RejectPurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using (var verify = db.NewContext())
                Assert.Equal(ReturnStatusEnum.REJECTED, verify.PurchaseReturns.Single().Status);

            using var reopenScope = db.NewScope();
            var reopenHandler = new ReopenPurchaseReturnCommandHandler(reopenScope.Db, reopenScope.PurchaseReturnCalculation, FakeObjectStorage.Instance, reopenScope.UnitOfWork);
            await reopenHandler.Handle(new ReopenPurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify2 = db.NewContext();
            Assert.Equal(ReturnStatusEnum.OPEN, verify2.PurchaseReturns.Single().Status);
        }

        [Fact]
        public async Task DeletePurchaseReturn_Untouched_SoftDeletesAndHidesFromReads()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            var handler = new DeletePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new DeletePurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.PurchaseReturns.Single().IsActive);
            Assert.NotEmpty(verify.PurchaseReturnClaims);

            using var readScope = db.NewScope();
            var detailHandler = new GetPurchaseReturnDetailQueryHandler(readScope.Db, readScope.PurchaseReturnCalculation, FakeObjectStorage.Instance);
            await Assert.ThrowsAsync<NotFoundCustomException>(() => detailHandler.Handle(new GetPurchaseReturnDetailQuery { Id = returnId }, CancellationToken.None));
        }

        [Fact]
        public async Task GetPurchaseReturnDetail_ReflectsFlags()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            using var readScope = db.NewScope();
            var handler = new GetPurchaseReturnDetailQueryHandler(readScope.Db, readScope.PurchaseReturnCalculation, FakeObjectStorage.Instance);
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

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            var handler = new GetPurchaseReturnPendingEffectsQueryHandler(scope.Db);
            var res = await handler.Handle(new GetPurchaseReturnPendingEffectsQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None);

            var list = ((System.Collections.Generic.IEnumerable<PendingEffectDto>)res.Data!.GetType().GetProperty("PendingEffects")!.GetValue(res.Data)!).ToList();
            var pending = Assert.Single(list);
            Assert.Equal(ReturnEffectDirectionEnum.GOODS_IN, pending.Direction);
        }

        // ─── Lifecycle regression (Cancel / Reject / Delete / Reopen) ───────────────────────────
        // Handler factories live here so a constructor change touches one place per handler.

        private static CancelPurchaseReturnCommandHandler NewCancel(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, FakeObjectStorage.Instance, s.UnitOfWork);
        private static RejectPurchaseReturnCommandHandler NewReject(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, FakeObjectStorage.Instance, s.UnitOfWork);
        private static ReopenPurchaseReturnCommandHandler NewReopen(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, FakeObjectStorage.Instance, s.UnitOfWork);
        private static DeletePurchaseReturnCommandHandler NewDelete(TestScope s) => new(s.Db, s.PurchaseReturnRepository, s.PurchaseReturnCalculation, s.UnitOfWork);
        private static AddClaimResolutionCommandHandler NewAdd(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);
        private static RemoveClaimResolutionCommandHandler NewRemove(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);
        private static ExecuteGoodsRoundCommandHandler NewRound(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, s.ProductUnitService, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);

        private static ReturnStatusEnum StatusOf(TestDatabase db)
        {
            using var verify = db.NewContext();
            return verify.PurchaseReturns.Single().Status;
        }

        [Fact]
        public async Task RejectAndCancel_StoreTheReason_AndReopenClearsIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            await SeedReceivedWithClaim(scope);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            var rejected = await NewReject(scope).Handle(new RejectPurchaseReturnCommand { Id = returnId, Reason = "  تامین‌کننده نپذیرفت  " }, CancellationToken.None);
            Assert.Equal("تامین‌کننده نپذیرفت", Assert.IsType<PurchaseReturnDetailDto>(rejected.Data).StatusReason);

            var reopened = await NewReopen(scope).Handle(new ReopenPurchaseReturnCommand { Id = returnId }, CancellationToken.None);
            Assert.Null(Assert.IsType<PurchaseReturnDetailDto>(reopened.Data).StatusReason);

            var cancelled = await NewCancel(scope).Handle(new CancelPurchaseReturnCommand { Id = returnId, Reason = "   " }, CancellationToken.None);
            Assert.Null(Assert.IsType<PurchaseReturnDetailDto>(cancelled.Data).StatusReason);

            using var verify = db.NewContext();
            Assert.Null(verify.PurchaseReturns.Single().StatusReason);
        }

        [Fact]
        public void Reason_LongerThan500_IsInvalid()
        {
            var tooLong = new string('x', 501);
            Assert.False(new RejectPurchaseReturnCommandValidator().Validate(new RejectPurchaseReturnCommand { Id = 1, Reason = tooLong }).IsValid);
            Assert.False(new CancelPurchaseReturnCommandValidator().Validate(new CancelPurchaseReturnCommand { Id = 1, Reason = tooLong }).IsValid);
            Assert.True(new CancelPurchaseReturnCommandValidator().Validate(new CancelPurchaseReturnCommand { Id = 1, Reason = new string('x', 500) }).IsValid);
        }

        [Fact]
        public async Task Regression_RejectThenStaleCancel_NamesRejectedAndReopenThenCancelWorks()
        {
            // The production sequence: Reject succeeds server-side, the client does not learn it, the
            // user presses Cancel on the stale page. That refusal used to say "only untouched returns
            // can be cancelled" - nothing to do with the real reason - and nothing pointed at Reopen.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            await SeedReceivedWithClaim(scope);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            var rejected = await NewReject(scope).Handle(new RejectPurchaseReturnCommand { Id = returnId }, CancellationToken.None);
            var rejectedDoc = Assert.IsType<PurchaseReturnDetailDto>(rejected.Data);
            Assert.Equal(ReturnStatusEnum.REJECTED, rejectedDoc.Status);
            Assert.True(rejectedDoc.CanReopen);
            Assert.False(rejectedDoc.CanCancel);

            var staleCancel = await Assert.ThrowsAsync<ValidationCustomException>(() => NewCancel(scope).Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None));
            Assert.Contains("رد شده", staleCancel.Error);
            Assert.Contains("بازگشایی", staleCancel.Error);
            Assert.DoesNotContain("دست‌نخورده", staleCancel.Error);
            Assert.Equal(ReturnStatusEnum.REJECTED, StatusOf(db));

            var staleReject = await Assert.ThrowsAsync<ValidationCustomException>(() => NewReject(scope).Handle(new RejectPurchaseReturnCommand { Id = returnId }, CancellationToken.None));
            Assert.Contains("بازگشایی", staleReject.Error);

            var reopened = await NewReopen(scope).Handle(new ReopenPurchaseReturnCommand { Id = returnId }, CancellationToken.None);
            Assert.Equal(ReturnStatusEnum.OPEN, Assert.IsType<PurchaseReturnDetailDto>(reopened.Data).Status);

            var cancelled = await NewCancel(scope).Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None);
            Assert.Equal(ReturnStatusEnum.CANCELLED, Assert.IsType<PurchaseReturnDetailDto>(cancelled.Data).Status);

            var deleteCancelled = await Assert.ThrowsAsync<ValidationCustomException>(() => NewDelete(scope).Handle(new DeletePurchaseReturnCommand { Id = returnId }, CancellationToken.None));
            Assert.Contains("لغو شده", deleteCancelled.Error);

            var reopenCancelled = await Assert.ThrowsAsync<ValidationCustomException>(() => NewReopen(scope).Handle(new ReopenPurchaseReturnCommand { Id = returnId }, CancellationToken.None));
            Assert.Contains("لغو شده", reopenCancelled.Error);
            Assert.Equal(ReturnStatusEnum.CANCELLED, StatusOf(db));
        }

        [Fact]
        public async Task Cancel_WithRecordedMoney_SaysSoAndRemovingTheMoneyResolutionUnlocksIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope, claimQty: 3);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 2, MoneyIn = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 2 * scenario.Item.UnitPrice } },
            }, CancellationToken.None);

            foreach (var attempt in new Func<Task>[]
            {
                () => NewCancel(scope).Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None),
                () => NewReject(scope).Handle(new RejectPurchaseReturnCommand { Id = returnId }, CancellationToken.None),
                () => NewDelete(scope).Handle(new DeletePurchaseReturnCommand { Id = returnId }, CancellationToken.None),
            })
            {
                var ex = await Assert.ThrowsAsync<ValidationCustomException>(attempt);
                Assert.Contains("اثر مالی", ex.Error);
                Assert.Contains("حذف", ex.Error);
            }

            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, StatusOf(db));

            var resolutionId = scope.Context.PurchaseReturnResolutions.Single().Id;
            await NewRemove(scope).Handle(new RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None);

            await NewCancel(scope).Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None);
            Assert.Equal(ReturnStatusEnum.CANCELLED, StatusOf(db));

            using var verify = db.NewContext();
            Assert.Equal(0, verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);
        }

        [Fact]
        public async Task Cancel_AfterPartialGoodsRound_IsRefusedEvenThoughEffectIsStillPending()
        {
            // The old guard only looked for APPLIED effects, so a goods effect with 1 of 3 units
            // physically moved (still PENDING) let the return be cancelled with stock already changed.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope, claimQty: 3);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            var effectId = scope.Context.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).Id;
            await NewRound(scope).Handle(new ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = returnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 1 } },
            }, CancellationToken.None);

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => NewCancel(scope).Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None));
            Assert.Contains("کالا", ex.Error);
            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, StatusOf(db));
        }

        [Fact]
        public async Task RejectWithPendingGoodsResolution_ReopenRecomputesInsteadOfForcingOpen()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedReceivedWithClaim(scope, claimQty: 3);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                // An equal swap: balance 0, so no money effect - recorded money would lock Reject.
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    GoodsIn = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } },
                    GoodsOut = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } },
                },
            }, CancellationToken.None);
            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, StatusOf(db));

            await NewReject(scope).Handle(new RejectPurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            // A rejected return's still-pending goods effect must not be offered to the warehouse.
            var pendingHandler = new GetPurchaseReturnPendingEffectsQueryHandler(scope.Db);
            var pendingRes = await pendingHandler.Handle(new GetPurchaseReturnPendingEffectsQuery(), CancellationToken.None);
            var pending = (System.Collections.Generic.IEnumerable<PendingEffectDto>)pendingRes.Data!.GetType().GetProperty("PendingEffects")!.GetValue(pendingRes.Data)!;
            Assert.Empty(pending);

            await NewReopen(scope).Handle(new ReopenPurchaseReturnCommand { Id = returnId }, CancellationToken.None);
            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, StatusOf(db));
        }

        [Fact]
        public async Task Cancel_OnSettledReturn_NamesTheStatus()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope, claimQty: 3);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, MoneyIn = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3 * scenario.Item.UnitPrice } },
            }, CancellationToken.None);

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => NewCancel(scope).Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None));
            Assert.Contains("تسویه شده", ex.Error);
        }

        [Fact]
        public async Task WriteCommands_ReturnTheUpdatedDetailDocument()
        {
            // The frontend drops every write's response straight into its detail cache and reads
            // `.id`/`.purchaseId` off it; a null or partial Data crashed its onSuccess, which is what
            // left the page stale after a lifecycle action that had actually succeeded.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand { PurchaseId = scenario.Purchase.Id, Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 5 } } }, CancellationToken.None);

            var created = await new CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork).Handle(new CreatePurchaseReturnCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 2, Problem = ReturnProblemEnum.DEFECTIVE } },
            }, CancellationToken.None);
            var createdDoc = Assert.IsType<PurchaseReturnDetailDto>(created.Data);
            Assert.Equal(scenario.Purchase.Id, createdDoc.PurchaseId);
            var claimId = Assert.Single(createdDoc.Claims).Id;

            var added = await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 2, GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 1000 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 2000 } },
            }, CancellationToken.None);
            var addedDoc = Assert.IsType<PurchaseReturnDetailDto>(added.Data);
            var resolution = Assert.Single(Assert.Single(addedDoc.Claims).Resolutions);

            var removed = await NewRemove(scope).Handle(new RemoveClaimResolutionCommand { Id = resolution.Id }, CancellationToken.None);
            Assert.Empty(Assert.Single(Assert.IsType<PurchaseReturnDetailDto>(removed.Data).Claims).Resolutions);

            var deleted = await NewDelete(scope).Handle(new DeletePurchaseReturnCommand { Id = createdDoc.Id }, CancellationToken.None);
            Assert.Equal(createdDoc.Id, (int)deleted.Data!.GetType().GetProperty("Id")!.GetValue(deleted.Data)!);
            Assert.Equal(scenario.Purchase.Id, (int)deleted.Data!.GetType().GetProperty("PurchaseId")!.GetValue(deleted.Data)!);
        }

        // ─── OFF_ORDER claims (EXCESS keeps its line; UNLISTED has none) ────────────────────────

        private static CreateReturnClaimDto ExcessClaim(PurchaseScenario scenario, int quantity, ulong? clientPrice = null, int? productId = null) => new()
        {
            Scope = ReturnClaimScopeEnum.OFF_ORDER,
            OffScopeKind = ReturnOffScopeKindEnum.EXCESS,
            OrderLineId = scenario.Item.Id,
            ProductId = productId ?? scenario.Product.Id,
            UnitPrice = clientPrice ?? scenario.Item.UnitPrice,
            Quantity = quantity,
            Problem = ReturnProblemEnum.OVER_SHIPPED,
        };

        private static async Task<int> CreateReturn(TestScope scope, PurchaseScenario scenario, params CreateReturnClaimDto[] claims)
        {
            var res = await new CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new CreatePurchaseReturnCommand { PurchaseId = scenario.Purchase.Id, Claims = claims.ToList() }, CancellationToken.None);
            return ((PurchaseReturnDetailDto)res.Data!).Id;
        }

        private static async Task Receive(TestScope scope, PurchaseScenario scenario, int quantity) =>
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand { PurchaseId = scenario.Purchase.Id, Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = quantity } } }, CancellationToken.None);

        [Fact]
        public async Task CreatePurchaseReturn_ExcessClaim_KeepsOrderLineAndIsPricedAtTheLine()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0, unitPrice: 1000);
            await Receive(scope, scenario, 8); // 3 excess held in quarantine - what an EXCESS claim may cover

            // The line's price must be sent as-is; a different price is a 400 (ReturnBalanceAndExcessTests).
            await CreateReturn(scope, scenario, ExcessClaim(scenario, quantity: 3, clientPrice: 1000));

            using (var verify = db.NewContext())
            {
                var claim = verify.PurchaseReturnClaims.Single();
                Assert.Equal(ReturnClaimScopeEnum.OFF_ORDER, claim.Scope);
                Assert.Equal(ReturnOffScopeKindEnum.EXCESS, claim.OffScopeKind);
                Assert.Equal(scenario.Item.Id, claim.PurchaseItemId);
                Assert.Equal(1000UL, claim.UnitPrice); // the line's price
            }

            // An EXCESS claim never consumes the line's quota: all 5 received units are still claimable.
            await CreateReturn(scope, scenario, new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = 950, Quantity = 5, Problem = ReturnProblemEnum.DEFECTIVE });

            using var verify2 = db.NewContext();
            // ON_ORDER keeps the client's price (it may be a net price).
            Assert.Equal(950UL, verify2.PurchaseReturnClaims.Single(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER).UnitPrice);
        }

        [Fact]
        public async Task CreatePurchaseReturn_ExcessClaimProductDiffersFromLine_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            var otherProduct = Seed.Product(scenario.Product.ProductCategory!, name: "کالای دوم");
            scope.Context.Products.Add(otherProduct);
            scope.Context.SaveChanges();

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => CreateReturn(scope, scenario, ExcessClaim(scenario, 1, productId: otherProduct.Id)));
            Assert.Contains("مطابقت ندارد", ex.Error);

            using var verify = db.NewContext();
            Assert.Empty(verify.PurchaseReturns);
        }

        [Fact]
        public async Task CreatePurchaseReturn_ExcessClaimLineOfAnotherPurchase_NotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            var other = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            var claim = ExcessClaim(scenario, 1);
            claim.OrderLineId = other.Item.Id;
            claim.ProductId = other.Product.Id;

            await Assert.ThrowsAsync<NotFoundCustomException>(() => CreateReturn(scope, scenario, claim));
        }

        [Fact]
        public async Task CreatePurchaseReturn_UnlistedClaimWithUnknownProduct_Returns400NotFkFailure()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => CreateReturn(scope, scenario, new CreateReturnClaimDto
            {
                Scope = ReturnClaimScopeEnum.OFF_ORDER,
                OffScopeKind = ReturnOffScopeKindEnum.UNLISTED,
                ProductId = 987654,
                UnitPrice = 500,
                Quantity = 1,
                Problem = ReturnProblemEnum.UNLISTED_ITEM,
            }));
            Assert.Equal(400, ex.StatusCode);

            using var verify = db.NewContext();
            Assert.Empty(verify.PurchaseReturns);
        }

        [Fact]
        public async Task CreatePurchaseReturn_UnlistedClaim_KeepsNoLineAndClientPrice()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            var unlisted = Seed.Product(scenario.Product.ProductCategory!, name: "کالای خارج از سفارش");
            scope.Context.Products.Add(unlisted);
            scope.Context.SaveChanges();

            // An UNLISTED claim covers only unlisted goods actually received and held.
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand { PurchaseId = scenario.Purchase.Id, UnlistedItems = new() { new ReceivePurchaseUnlistedItemDto { ProductId = unlisted.Id, ArrivedQuantity = 1 } } }, CancellationToken.None);

            await CreateReturn(scope, scenario, new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.OFF_ORDER, OffScopeKind = ReturnOffScopeKindEnum.UNLISTED, ProductId = unlisted.Id, UnitPrice = 555, Quantity = 1, Problem = ReturnProblemEnum.UNLISTED_ITEM });

            using var verify = db.NewContext();
            var claim = verify.PurchaseReturnClaims.Single();
            Assert.Null(claim.PurchaseItemId);
            Assert.Equal(555UL, claim.UnitPrice);
        }

        [Fact]
        public async Task ExcessClaim_MoneyResolution_NeverSettlesTheLine_AndRemovingItNeverUnsettlesIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            await Receive(scope, scenario, 7);
            await CreateReturn(scope, scenario, ExcessClaim(scenario, 2));
            var claimId = scope.Context.PurchaseReturnClaims.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 2, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 2000 } },
            }, CancellationToken.None);

            using (var verify = db.NewContext())
                Assert.Equal(0, verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);

            var resolutionId = scope.Context.PurchaseReturnResolutions.Single().Id;
            await NewRemove(scope).Handle(new RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None);

            using var verify2 = db.NewContext();
            Assert.Equal(0, verify2.PurchaseItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity); // not -2
        }

        [Fact]
        public async Task ExcessClaim_GoodsOutRound_LowersStockLikeAnyOtherClaim_AndDoesNotSettle()
        {
            // The effect layer does not know the claim is off the invoice: GOODS_OUT lowers stock and
            // returns units for every claim. Priced at zero by the client, the goods need no money.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            await Receive(scope, scenario, 7); // 5 on the line in stock, 2 excess held
            var returnId = await CreateReturn(scope, scenario, ExcessClaim(scenario, 2));
            var claimId = scope.Context.PurchaseReturnClaims.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                // Excess was never paid for: it leaves at an explicit zero cost.
                Composition = new EffectCompositionDto { Quantity = 2, GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 0, UnitCost = 0 } } },
            }, CancellationToken.None);

            var excessEffectId = scope.Context.PurchaseReturnEffects.Single().Id;
            await NewRound(scope).Handle(new ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = returnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = excessEffectId, Quantity = 2, Source = ProductUnitStatusEnum.QUARANTINED } },
            }, CancellationToken.None);

            // The two held excess units go back; the 5 on the line stay on the shelf.
            using var verify = db.NewContext();
            Assert.Equal(5, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
            Assert.Equal(5, verify.ProductUnits.Count(u => u.ProductId == scenario.Product.Id && u.Status == ProductUnitStatusEnum.IN_STOCK));
            Assert.Equal(0m, verify.InventoryCostLedgerEntries.Sum(x => x.OffPoolValueDelta));
            Assert.Equal(2, verify.ProductUnits.Count(u => u.ProductId == scenario.Product.Id && u.Status == ProductUnitStatusEnum.RETURNED_TO_SUPPLIER));
            Assert.Equal(0, verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);
            Assert.Equal(ReturnStatusEnum.SETTLED, verify.PurchaseReturns.Single().Status);
        }

        [Fact]
        public async Task ExecuteGoodsRound_RefusedOnALaterLine_LeavesNoTrackedChangeFromEarlierLines()
        {
            // Validation used to run line by line interleaved with the writes. A refusal on line 2
            // left line 1's stock and AppliedQuantity changed on the tracked graph, so any SaveChanges
            // on the same context afterwards (a retry, a test, a future pipeline step) persisted them.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedReceivedWithClaim(scope, claimQty: 3);
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            var effect = scope.Context.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN);
            var stockBefore = scope.Context.Products.Single(x => x.Id == scenario.Product.Id).Stock;

            await Assert.ThrowsAsync<ValidationCustomException>(() => NewRound(scope).Handle(new ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = returnId,
                Rounds = new()
                {
                    new GoodsRoundLineDto { EffectId = effect.Id, Quantity = 2 },
                    new GoodsRoundLineDto { EffectId = effect.Id, Quantity = 2 }, // 4 > 3 remaining in total
                },
            }, CancellationToken.None));

            Assert.Equal(0, effect.AppliedQuantity);
            Assert.Equal(stockBefore, scope.Context.Products.Local.Single(x => x.Id == scenario.Product.Id).Stock);

            await scope.Context.SaveChangesAsync();
            using var verify = db.NewContext();
            Assert.Equal(0, verify.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).AppliedQuantity);
            Assert.Empty(verify.PurchaseReturnEffectRounds);
        }
    }
}
