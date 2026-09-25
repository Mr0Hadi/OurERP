using Application.Common.Dtos.Returns;
using Application.Features.SaleReturn.Commands;
using Application.Features.SaleReturn.Dtos;
using Application.Features.SaleReturn.Queries;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class SaleReturnLifecycleTests
    {
        private static async Task<(SaleScenario scenario, int claimId)> SeedShippedWithClaim(TestScope scope, int ordered = 10, int shipped = 10, int claimQty = 5)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: ordered, shippedQuantity: shipped, stock: 0);

            var createHandler = new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);
            await createHandler.Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
                Claims = new()
                {
                    new CreateReturnClaimDto
                    {
                        Scope = ReturnClaimScopeEnum.ON_ORDER,
                        OrderLineId = scenario.Item.Id,
                        ProductId = scenario.Product.Id,
                        UnitPrice = scenario.Item.UnitPrice,
                        Quantity = claimQty,
                        Problem = ReturnProblemEnum.DEFECTIVE,
                    },
                },
            }, CancellationToken.None);

            var claimId = scope.Context.SaleReturnClaims.Single().Id;
            return (scenario, claimId);
        }

        [Fact]
        public async Task CreateSaleReturn_ClaimExceedsShipped_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0);

            var handler = new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
                Claims = new()
                {
                    new CreateReturnClaimDto
                    {
                        Scope = ReturnClaimScopeEnum.ON_ORDER,
                        OrderLineId = scenario.Item.Id,
                        ProductId = scenario.Product.Id,
                        UnitPrice = scenario.Item.UnitPrice,
                        Quantity = 6,
                        Problem = ReturnProblemEnum.DEFECTIVE,
                    },
                },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateSaleReturn_ConcurrentClaimsRespectRemainingBudget()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 10, shippedQuantity: 10, stock: 0);

            var handler = new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);
            var claim = new CreateReturnClaimDto
            {
                Scope = ReturnClaimScopeEnum.ON_ORDER,
                OrderLineId = scenario.Item.Id,
                ProductId = scenario.Product.Id,
                UnitPrice = scenario.Item.UnitPrice,
                Quantity = 6,
                Problem = ReturnProblemEnum.DEFECTIVE,
            };

            await handler.Handle(new CreateSaleReturnCommand { SaleId = scenario.Sale.Id, Claims = new() { claim } }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
                Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 5, Problem = ReturnProblemEnum.DEFECTIVE } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateSaleReturn_OnOrderClaimProductDiffersFromLine_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0);

            var otherProduct = Seed.Product(scenario.Product.ProductCategory!, name: "کالای دوم");
            scope.Context.Products.Add(otherProduct);
            scope.Context.SaveChanges();

            var handler = new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);

            // Quantity is within the line's quota, so only the product check can reject it.
            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
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
            Assert.Empty(verify.SaleReturns);
        }

        [Fact]
        public async Task AddClaimResolution_MoneyOnly_SettlesImmediatelyAndMarksSaleReturned()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope, ordered: 5, shipped: 5, claimQty: 5);

            var handler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await handler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 5,
                    MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 5 * scenario.Item.UnitPrice },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.SaleItems.Single(x => x.Id == scenario.Item.Id);
            var sale = verify.Sales.Single(x => x.Id == scenario.Sale.Id);
            var saleReturn = verify.SaleReturns.Single();

            Assert.Equal(5, item.SettledQuantity);
            Assert.Equal(SalesStatusEnum.RETURNED, sale.Status);
            Assert.Equal(ReturnStatusEnum.SETTLED, saleReturn.Status);
        }

        [Fact]
        public async Task ExecuteGoodsRound_GoodsInHealthyOnly_RestocksFullAmount()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsIn = new() { new GoodsEffectDto { Quantity = 5, UnitPrice = 1500 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 7500 } },
            }, CancellationToken.None);

            var effectId = scope.Context.SaleReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).Id;
            var saleReturnId = scope.Context.SaleReturns.Single().Id;
            var stockBefore = scope.Context.Products.Single(x => x.Id == scenario.Product.Id).Stock;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                SaleReturnId = saleReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 5 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);
            var effect = verify.SaleReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN);

            Assert.Equal(stockBefore + 5, product.Stock);
            Assert.Equal(5, effect.RestockedQuantity);
            Assert.Equal(ReturnEffectStatusEnum.APPLIED, effect.Status);
        }

        [Fact]
        public async Task AddClaimResolution_MultipleGoodsOutProducts_ProducesOneEffectPerProduct()
        {
            // A replacement split across two different products, shipped out in a single resolution.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope);

            var otherProduct = Seed.Product(scenario.Product.ProductCategory!, name: "کالای دوم");
            scope.Context.Products.Add(otherProduct);
            scope.Context.SaveChanges();

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 5,
                    GoodsOut = new()
                    {
                        new GoodsEffectDto { Quantity = 3, UnitPrice = 1500 },
                        new GoodsEffectDto { Quantity = 2, ProductId = otherProduct.Id, UnitPrice = scenario.Item.UnitPrice },
                    },
                    MoneyIn = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 5 * scenario.Item.UnitPrice },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var effects = verify.SaleReturnEffects.Where(e => e.Direction == ReturnEffectDirectionEnum.GOODS_OUT).ToList();

            Assert.Equal(2, effects.Count);
            Assert.Contains(effects, e => e.ProductId == scenario.Product.Id && e.Quantity == 3);
            Assert.Contains(effects, e => e.ProductId == otherProduct.Id && e.Quantity == 2);
            Assert.All(effects, e => Assert.Equal(ReturnEffectDirectionEnum.GOODS_OUT, e.Direction));
        }

        [Fact]
        public async Task ExecuteGoodsRound_GoodsInWithDefectiveObservation_RestocksOnlyHealthyPortion()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsIn = new() { new GoodsEffectDto { Quantity = 5, UnitPrice = 1500 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 7500 } },
            }, CancellationToken.None);

            var effectId = scope.Context.SaleReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).Id;
            var saleReturnId = scope.Context.SaleReturns.Single().Id;
            var stockBefore = scope.Context.Products.Single(x => x.Id == scenario.Product.Id).Stock;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                SaleReturnId = saleReturnId,
                Rounds = new()
                {
                    new GoodsRoundLineDto
                    {
                        EffectId = effectId,
                        Quantity = 5,
                        Observations = new() { new GoodsRoundObservationDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = 2 } },
                    },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);
            var effect = verify.SaleReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN);

            Assert.Equal(stockBefore + 3, product.Stock); // only the 3 healthy units restocked
            Assert.Equal(3, effect.RestockedQuantity);
        }

        [Fact]
        public async Task ExecuteGoodsRound_GoodsOutReplacement_ConsumesStock()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope);

            // Replacement units need to exist in stock before they can be shipped out.
            var product = scope.Context.Products.Single(x => x.Id == scenario.Product.Id);
            product.Stock += 5;
            Seed.MintUnits(scope.Context, product, 5);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsOut = new() { new GoodsEffectDto { Quantity = 5, UnitPrice = 1500 } }, MoneyIn = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 7500 } },
            }, CancellationToken.None);

            var effectId = scope.Context.SaleReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_OUT).Id;
            var saleReturnId = scope.Context.SaleReturns.Single().Id;
            var stockBefore = scope.Context.Products.Single(x => x.Id == scenario.Product.Id).Stock;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                SaleReturnId = saleReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 5 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(stockBefore - 5, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task RemoveClaimResolution_AfterGoodsMoved_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedShippedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsIn = new() { new GoodsEffectDto { Quantity = 5, UnitPrice = 1500 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 7500 } },
            }, CancellationToken.None);

            var effectId = scope.Context.SaleReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).Id;
            var resolutionId = scope.Context.SaleReturnResolutions.Single().Id;
            var saleReturnId = scope.Context.SaleReturns.Single().Id;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                SaleReturnId = saleReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 1 } },
            }, CancellationToken.None);

            var removeHandler = new RemoveClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => removeHandler.Handle(new RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None));
        }

        [Fact]
        public async Task RemoveClaimResolution_MoneyOnly_RollsBackSettledQuantity()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 500 } },
            }, CancellationToken.None);

            var resolutionId = scope.Context.SaleReturnResolutions.Single().Id;

            var removeHandler = new RemoveClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await removeHandler.Handle(new RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(0, verify.SaleItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);
        }

        [Fact]
        public async Task CancelSaleReturn_Untouched_Succeeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedShippedWithClaim(scope);
            var returnId = scope.Context.SaleReturns.Single().Id;

            var handler = new CancelSaleReturnCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new CancelSaleReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(ReturnStatusEnum.CANCELLED, verify.SaleReturns.Single().Status);
        }

        [Fact]
        public async Task CancelSaleReturn_AfterResolutionApplied_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedShippedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 500 } },
            }, CancellationToken.None);

            var returnId = scope.Context.SaleReturns.Single().Id;
            var handler = new CancelSaleReturnCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CancelSaleReturnCommand { Id = returnId }, CancellationToken.None));
        }

        [Fact]
        public async Task RejectThenReopen_GoesBackToOpen()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedShippedWithClaim(scope);
            var returnId = scope.Context.SaleReturns.Single().Id;

            var rejectHandler = new RejectSaleReturnCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.UnitOfWork);
            await rejectHandler.Handle(new RejectSaleReturnCommand { Id = returnId }, CancellationToken.None);

            using (var verify = db.NewContext())
                Assert.Equal(ReturnStatusEnum.REJECTED, verify.SaleReturns.Single().Status);

            using var reopenScope = db.NewScope();
            var reopenHandler = new ReopenSaleReturnCommandHandler(reopenScope.Db, reopenScope.SaleReturnCalculation, reopenScope.UnitOfWork);
            await reopenHandler.Handle(new ReopenSaleReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify2 = db.NewContext();
            Assert.Equal(ReturnStatusEnum.OPEN, verify2.SaleReturns.Single().Status);
        }

        [Fact]
        public async Task DeleteSaleReturn_Untouched_SoftDeletesAndHidesFromReads()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedShippedWithClaim(scope);
            var returnId = scope.Context.SaleReturns.Single().Id;

            var handler = new DeleteSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new DeleteSaleReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.SaleReturns.Single().IsActive);
            Assert.NotEmpty(verify.SaleReturnClaims);

            using var readScope = db.NewScope();
            var detailHandler = new GetSaleReturnDetailQueryHandler(readScope.Db, readScope.SaleReturnCalculation);
            await Assert.ThrowsAsync<NotFoundCustomException>(() => detailHandler.Handle(new GetSaleReturnDetailQuery { Id = returnId }, CancellationToken.None));
        }

        [Fact]
        public async Task GetSaleReturnDetail_ReflectsFlags()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedShippedWithClaim(scope);
            var returnId = scope.Context.SaleReturns.Single().Id;

            using var readScope = db.NewScope();
            var handler = new GetSaleReturnDetailQueryHandler(readScope.Db, readScope.SaleReturnCalculation);
            var detail = (SaleReturnDetailDto)(await handler.Handle(new GetSaleReturnDetailQuery { Id = returnId }, CancellationToken.None)).Data!;

            Assert.True(detail.CanCancel);
            Assert.True(detail.CanReject);
            Assert.True(detail.CanDelete);
            Assert.False(detail.CanReopen);
            Assert.Single(detail.Claims);
        }

        [Fact]
        public async Task GetSaleReturnList_FiltersByStatus()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            await SeedShippedWithClaim(scope);

            var handler = new GetSaleReturnListQueryHandler(scope.Db);
            var res = await handler.Handle(new GetSaleReturnListQuery { Status = ReturnStatusEnum.OPEN }, CancellationToken.None);

            var list = (System.Collections.IEnumerable)res.Data!.GetType().GetProperty("ReturnList")!.GetValue(res.Data)!;
            Assert.NotEmpty(list.Cast<object>());
        }

        [Fact]
        public async Task GetSaleReturnPendingEffects_ListsOnlyPendingGoodsEffects()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsIn = new() { new GoodsEffectDto { Quantity = 5, UnitPrice = 1500 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 7500 } },
            }, CancellationToken.None);

            var handler = new GetSaleReturnPendingEffectsQueryHandler(scope.Db);
            var res = await handler.Handle(new GetSaleReturnPendingEffectsQuery { SaleId = scenario.Sale.Id }, CancellationToken.None);

            var list = ((System.Collections.Generic.IEnumerable<PendingEffectDto>)res.Data!.GetType().GetProperty("PendingEffects")!.GetValue(res.Data)!).ToList();
            var pending = Assert.Single(list);
            Assert.Equal(ReturnEffectDirectionEnum.GOODS_IN, pending.Direction);
        }

        // ─── Lifecycle regression (Cancel / Reject / Delete / Reopen) ───────────────────────────

        private static CancelSaleReturnCommandHandler NewCancel(TestScope s) => new(s.Db, s.SaleReturnCalculation, s.UnitOfWork);
        private static RejectSaleReturnCommandHandler NewReject(TestScope s) => new(s.Db, s.SaleReturnCalculation, s.UnitOfWork);
        private static ReopenSaleReturnCommandHandler NewReopen(TestScope s) => new(s.Db, s.SaleReturnCalculation, s.UnitOfWork);
        private static DeleteSaleReturnCommandHandler NewDelete(TestScope s) => new(s.Db, s.SaleReturnRepository, s.SaleReturnCalculation, s.UnitOfWork);
        private static AddClaimResolutionCommandHandler NewAdd(TestScope s) => new(s.Db, s.SaleReturnCalculation, s.InventoryCostingService, s.UnitOfWork);
        private static RemoveClaimResolutionCommandHandler NewRemove(TestScope s) => new(s.Db, s.SaleReturnCalculation, s.InventoryCostingService, s.UnitOfWork);
        private static ExecuteGoodsRoundCommandHandler NewRound(TestScope s) => new(s.Db, s.SaleReturnCalculation, s.ProductUnitService, s.InventoryCostingService, s.UnitOfWork);

        private static ReturnStatusEnum StatusOf(TestDatabase db)
        {
            using var verify = db.NewContext();
            return verify.SaleReturns.Single().Status;
        }

        [Fact]
        public async Task RejectAndCancel_StoreTheReason_AndReopenClearsIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            await SeedShippedWithClaim(scope);
            var returnId = scope.Context.SaleReturns.Single().Id;

            var rejected = await NewReject(scope).Handle(new RejectSaleReturnCommand { Id = returnId, Reason = "  تامین‌کننده نپذیرفت  " }, CancellationToken.None);
            Assert.Equal("تامین‌کننده نپذیرفت", Assert.IsType<SaleReturnDetailDto>(rejected.Data).StatusReason);

            var reopened = await NewReopen(scope).Handle(new ReopenSaleReturnCommand { Id = returnId }, CancellationToken.None);
            Assert.Null(Assert.IsType<SaleReturnDetailDto>(reopened.Data).StatusReason);

            var cancelled = await NewCancel(scope).Handle(new CancelSaleReturnCommand { Id = returnId, Reason = "   " }, CancellationToken.None);
            Assert.Null(Assert.IsType<SaleReturnDetailDto>(cancelled.Data).StatusReason);

            using var verify = db.NewContext();
            Assert.Null(verify.SaleReturns.Single().StatusReason);
        }

        [Fact]
        public void Reason_LongerThan500_IsInvalid()
        {
            var tooLong = new string('x', 501);
            Assert.False(new RejectSaleReturnCommandValidator().Validate(new RejectSaleReturnCommand { Id = 1, Reason = tooLong }).IsValid);
            Assert.False(new CancelSaleReturnCommandValidator().Validate(new CancelSaleReturnCommand { Id = 1, Reason = tooLong }).IsValid);
            Assert.True(new CancelSaleReturnCommandValidator().Validate(new CancelSaleReturnCommand { Id = 1, Reason = new string('x', 500) }).IsValid);
        }

        [Fact]
        public async Task Regression_RejectThenStaleCancel_NamesRejectedAndReopenThenCancelWorks()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            await SeedShippedWithClaim(scope);
            var returnId = scope.Context.SaleReturns.Single().Id;

            var rejected = await NewReject(scope).Handle(new RejectSaleReturnCommand { Id = returnId }, CancellationToken.None);
            var rejectedDoc = Assert.IsType<SaleReturnDetailDto>(rejected.Data);
            Assert.Equal(ReturnStatusEnum.REJECTED, rejectedDoc.Status);
            Assert.True(rejectedDoc.CanReopen);
            Assert.False(rejectedDoc.CanCancel);

            var staleCancel = await Assert.ThrowsAsync<ValidationCustomException>(() => NewCancel(scope).Handle(new CancelSaleReturnCommand { Id = returnId }, CancellationToken.None));
            Assert.Contains("رد شده", staleCancel.Error);
            Assert.Contains("بازگشایی", staleCancel.Error);
            Assert.DoesNotContain("دست‌نخورده", staleCancel.Error);
            Assert.Equal(ReturnStatusEnum.REJECTED, StatusOf(db));

            var reopened = await NewReopen(scope).Handle(new ReopenSaleReturnCommand { Id = returnId }, CancellationToken.None);
            Assert.Equal(ReturnStatusEnum.OPEN, Assert.IsType<SaleReturnDetailDto>(reopened.Data).Status);

            var cancelled = await NewCancel(scope).Handle(new CancelSaleReturnCommand { Id = returnId }, CancellationToken.None);
            Assert.Equal(ReturnStatusEnum.CANCELLED, Assert.IsType<SaleReturnDetailDto>(cancelled.Data).Status);

            var deleteCancelled = await Assert.ThrowsAsync<ValidationCustomException>(() => NewDelete(scope).Handle(new DeleteSaleReturnCommand { Id = returnId }, CancellationToken.None));
            Assert.Contains("لغو شده", deleteCancelled.Error);
            Assert.Equal(ReturnStatusEnum.CANCELLED, StatusOf(db));
        }

        [Fact]
        public async Task Cancel_WithRecordedRefund_SaysSo_AndRemovingItReversesTheLedgerAndUnlocksCancel()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope, claimQty: 5);
            var returnId = scope.Context.SaleReturns.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 2, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            foreach (var attempt in new Func<Task>[]
            {
                () => NewCancel(scope).Handle(new CancelSaleReturnCommand { Id = returnId }, CancellationToken.None),
                () => NewReject(scope).Handle(new RejectSaleReturnCommand { Id = returnId }, CancellationToken.None),
                () => NewDelete(scope).Handle(new DeleteSaleReturnCommand { Id = returnId }, CancellationToken.None),
            })
            {
                var ex = await Assert.ThrowsAsync<ValidationCustomException>(attempt);
                Assert.Contains("اثر مالی", ex.Error);
            }

            var resolutionId = scope.Context.SaleReturnResolutions.Single().Id;
            await NewRemove(scope).Handle(new RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None);
            await NewCancel(scope).Handle(new CancelSaleReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(ReturnStatusEnum.CANCELLED, verify.SaleReturns.Single().Status);
            var refundRows = verify.InventoryCostLedgerEntries.Where(e => e.EventType == InventoryCostEventTypeEnum.SALE_RETURN_REFUND).ToList();
            Assert.Equal(2, refundRows.Count);
            Assert.Equal(0m, refundRows.Sum(e => e.RevenueDelta)); // the refund row and its reversal net out
        }

        [Fact]
        public async Task Cancel_AfterPartialGoodsRound_IsRefusedEvenThoughEffectIsStillPending()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedShippedWithClaim(scope, claimQty: 5);
            var returnId = scope.Context.SaleReturns.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsIn = new() { new GoodsEffectDto { Quantity = 5, UnitPrice = 1500 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 7500 } },
            }, CancellationToken.None);

            var effectId = scope.Context.SaleReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).Id;
            await NewRound(scope).Handle(new ExecuteGoodsRoundCommand
            {
                SaleReturnId = returnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 1 } },
            }, CancellationToken.None);

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => NewReject(scope).Handle(new RejectSaleReturnCommand { Id = returnId }, CancellationToken.None));
            Assert.Contains("کالا", ex.Error);
            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, StatusOf(db));
        }

        [Fact]
        public async Task RejectWithPendingGoodsResolution_HiddenFromPendingEffects_AndReopenRecomputes()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope, claimQty: 5);
            var returnId = scope.Context.SaleReturns.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                // An equal swap: balance 0, so no money effect - recorded money would lock Reject.
                Composition = new EffectCompositionDto
                {
                    Quantity = 5,
                    GoodsIn = new() { new GoodsEffectDto { Quantity = 5, UnitPrice = 1500 } },
                    GoodsOut = new() { new GoodsEffectDto { Quantity = 5, UnitPrice = 1500 } },
                },
            }, CancellationToken.None);

            await NewReject(scope).Handle(new RejectSaleReturnCommand { Id = returnId }, CancellationToken.None);

            var pendingRes = await new GetSaleReturnPendingEffectsQueryHandler(scope.Db).Handle(new GetSaleReturnPendingEffectsQuery { SaleId = scenario.Sale.Id }, CancellationToken.None);
            var pending = (System.Collections.Generic.IEnumerable<PendingEffectDto>)pendingRes.Data!.GetType().GetProperty("PendingEffects")!.GetValue(pendingRes.Data)!;
            Assert.Empty(pending);

            await NewReopen(scope).Handle(new ReopenSaleReturnCommand { Id = returnId }, CancellationToken.None);
            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, StatusOf(db));
        }

        [Fact]
        public async Task WriteCommands_ReturnTheUpdatedDetailDocument()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0);

            var created = await new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork).Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
                Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 2, Problem = ReturnProblemEnum.DEFECTIVE } },
            }, CancellationToken.None);
            var createdDoc = Assert.IsType<SaleReturnDetailDto>(created.Data);
            Assert.Equal(scenario.Sale.Id, createdDoc.SaleId);
            var claimId = Assert.Single(createdDoc.Claims).Id;

            var added = await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 2, GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 1500 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);
            var addedDoc = Assert.IsType<SaleReturnDetailDto>(added.Data);
            var effectId = Assert.Single(Assert.Single(addedDoc.Claims).Resolutions).Effects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).Id;

            var round = await NewRound(scope).Handle(new ExecuteGoodsRoundCommand
            {
                SaleReturnId = createdDoc.Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 2 } },
            }, CancellationToken.None);
            Assert.Equal(ReturnStatusEnum.SETTLED, Assert.IsType<SaleReturnDetailDto>(round.Data).Status);
        }

        // ─── OFF_ORDER claims (EXCESS keeps its line; UNLISTED has none) ────────────────────────

        private static CreateReturnClaimDto ExcessClaim(SaleScenario scenario, int quantity, ulong? clientPrice = null, int? productId = null) => new()
        {
            Scope = ReturnClaimScopeEnum.OFF_ORDER,
            OffScopeKind = ReturnOffScopeKindEnum.EXCESS,
            OrderLineId = scenario.Item.Id,
            ProductId = productId ?? scenario.Product.Id,
            UnitPrice = clientPrice ?? scenario.Item.UnitPrice,
            Quantity = quantity,
            Problem = ReturnProblemEnum.OVER_SHIPPED,
        };

        private static async Task<int> CreateReturn(TestScope scope, SaleScenario scenario, params CreateReturnClaimDto[] claims)
        {
            var res = await new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork)
                .Handle(new CreateSaleReturnCommand { SaleId = scenario.Sale.Id, Claims = claims.ToList() }, CancellationToken.None);
            return ((SaleReturnDetailDto)res.Data!).Id;
        }

        // An EXCESS claim covers only excess recorded as shipped; the line is already fully shipped.
        private static Task ShipExcess(TestScope scope, SaleScenario scenario, int quantity) =>
            new Application.Features.Sale.Commands.ShipSaleCommandHandler(scope.Db, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork)
                .Handle(new Application.Features.Sale.Commands.ShipSaleCommand
                {
                    SaleId = scenario.Sale.Id,
                    Items = new() { new Application.Features.Sale.Dtos.ShipSaleItemDto { SaleItemId = scenario.Item.Id, ExcessQuantity = quantity } },
                }, CancellationToken.None);

        [Fact]
        public async Task CreateSaleReturn_ExcessClaim_KeepsOrderLineAndIsPricedAtTheLine()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 2, unitPrice: 1500);
            await ShipExcess(scope, scenario, 2);

            // The line's price must be sent as-is; a different price is a 400 (ReturnBalanceAndExcessTests).
            await CreateReturn(scope, scenario, ExcessClaim(scenario, quantity: 2, clientPrice: 1500));

            using (var verify = db.NewContext())
            {
                var claim = verify.SaleReturnClaims.Single();
                Assert.Equal(ReturnOffScopeKindEnum.EXCESS, claim.OffScopeKind);
                Assert.Equal(scenario.Item.Id, claim.SaleItemId);
                Assert.Equal(1500UL, claim.UnitPrice); // the line's price
            }

            // The whole shipped quantity is still claimable on the line.
            await CreateReturn(scope, scenario, new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = 1400, Quantity = 5, Problem = ReturnProblemEnum.DEFECTIVE });

            using var verify2 = db.NewContext();
            Assert.Equal(1400UL, verify2.SaleReturnClaims.Single(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER).UnitPrice);
        }

        [Fact]
        public async Task CreateSaleReturn_ExcessClaimProductDiffersFromLine_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0);
            var otherProduct = Seed.Product(scenario.Product.ProductCategory!, name: "کالای دوم");
            scope.Context.Products.Add(otherProduct);
            scope.Context.SaveChanges();

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => CreateReturn(scope, scenario, ExcessClaim(scenario, 1, productId: otherProduct.Id)));
            Assert.Contains("مطابقت ندارد", ex.Error);
        }

        [Fact]
        public async Task CreateSaleReturn_UnlistedClaimWithUnknownProduct_Returns400NotFkFailure()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0);

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
            Assert.Empty(verify.SaleReturns);
        }

        [Fact]
        public async Task ExcessClaim_MoneyResolution_NeverSettlesTheLine()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            // stock: 2 - a money-only resolution on off-invoice goods writes the kept extras off.
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 2, shippedQuantity: 2, stock: 2);
            await ShipExcess(scope, scenario, 2);
            await CreateReturn(scope, scenario, ExcessClaim(scenario, 2));
            var claimId = scope.Context.SaleReturnClaims.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 2, MoneyIn = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 3000 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(0, verify.SaleItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);
            // Settling 2 of 2 shipped units would have flipped the whole sale to RETURNED.
            Assert.NotEqual(SalesStatusEnum.RETURNED, verify.Sales.Single(x => x.Id == scenario.Sale.Id).Status);
        }

        [Fact]
        public async Task ExcessClaim_GoodsInRound_RaisesStockLikeAnyOtherClaim_AndDoesNotSettle()
        {
            // GOODS_IN raises stock like any claim. The units that come back are the excess ones recorded on the line
            // (ShipSale ExcessQuantity) - restored, not minted - and the line's ordered SOLD units are left alone.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 2);
            await ShipExcess(scope, scenario, 2);
            var unitsBefore = scope.Context.ProductUnits.Count(u => u.ProductId == scenario.Product.Id);
            var returnId = await CreateReturn(scope, scenario, ExcessClaim(scenario, 2));
            var claimId = scope.Context.SaleReturnClaims.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 2, GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 0 } } },
            }, CancellationToken.None);

            var excessEffectId = scope.Context.SaleReturnEffects.Single().Id;
            await NewRound(scope).Handle(new ExecuteGoodsRoundCommand
            {
                SaleReturnId = returnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = excessEffectId, Quantity = 2 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(2, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
            Assert.Equal(5, verify.ProductUnits.Count(u => u.SaleItemId == scenario.Item.Id && u.Status == ProductUnitStatusEnum.SOLD));
            Assert.Equal(2, verify.ProductUnits.Count(u => u.ProductId == scenario.Product.Id && u.Status == ProductUnitStatusEnum.IN_STOCK));
            Assert.Equal(unitsBefore, verify.ProductUnits.Count(u => u.ProductId == scenario.Product.Id)); // restored, not minted
            Assert.Equal(0, verify.SaleItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);
        }

        [Fact]
        public async Task ExecuteGoodsRound_RefusedOnALaterLine_LeavesNoTrackedChangeFromEarlierLines()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope, claimQty: 5);
            var returnId = scope.Context.SaleReturns.Single().Id;

            await NewAdd(scope).Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsIn = new() { new GoodsEffectDto { Quantity = 5, UnitPrice = 1500 } }, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 7500 } },
            }, CancellationToken.None);

            var effect = scope.Context.SaleReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN);
            var stockBefore = scope.Context.Products.Single(x => x.Id == scenario.Product.Id).Stock;
            var soldUnitsBefore = scope.Context.ProductUnits.Count(u => u.SaleItemId == scenario.Item.Id && u.Status == ProductUnitStatusEnum.SOLD);

            await Assert.ThrowsAsync<ValidationCustomException>(() => NewRound(scope).Handle(new ExecuteGoodsRoundCommand
            {
                SaleReturnId = returnId,
                Rounds = new()
                {
                    new GoodsRoundLineDto { EffectId = effect.Id, Quantity = 3 },
                    new GoodsRoundLineDto { EffectId = effect.Id, Quantity = 3 }, // 6 > 5 remaining in total
                },
            }, CancellationToken.None));

            Assert.Equal(0, effect.AppliedQuantity);
            Assert.Equal(stockBefore, scope.Context.Products.Local.Single(x => x.Id == scenario.Product.Id).Stock);

            await scope.Context.SaveChangesAsync();
            using var verify = db.NewContext();
            Assert.Equal(0, verify.SaleReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).AppliedQuantity);
            // No unit was restored by the refused round (the fixture ships 10, the claim is for 5).
            Assert.Equal(soldUnitsBefore, verify.ProductUnits.Count(u => u.SaleItemId == scenario.Item.Id && u.Status == ProductUnitStatusEnum.SOLD));
        }
    }
}
