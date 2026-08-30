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
        public async Task AddClaimResolution_MoneyOnly_SettlesImmediatelyAndMarksSaleReturned()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope, ordered: 5, shipped: 5, claimQty: 5);

            var handler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await handler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 5,
                    Money = new MoneyEffectDto { Kind = ReturnEffectKindEnum.MONEY_OUT, Method = ReturnPaymentMethodEnum.CASH, Amount = 5 * scenario.Item.UnitPrice },
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

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsIn = new GoodsEffectDto { Quantity = 5 } },
            }, CancellationToken.None);

            var effectId = scope.Context.SaleReturnEffects.Single().Id;
            var saleReturnId = scope.Context.SaleReturns.Single().Id;
            var stockBefore = scope.Context.Products.Single(x => x.Id == scenario.Product.Id).Stock;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                SaleReturnId = saleReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 5 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);
            var effect = verify.SaleReturnEffects.Single();

            Assert.Equal(stockBefore + 5, product.Stock);
            Assert.Equal(5, effect.RestockedQuantity);
            Assert.Equal(ReturnEffectStatusEnum.APPLIED, effect.Status);
        }

        [Fact]
        public async Task ExecuteGoodsRound_GoodsInWithDefectiveObservation_RestocksOnlyHealthyPortion()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsIn = new GoodsEffectDto { Quantity = 5 } },
            }, CancellationToken.None);

            var effectId = scope.Context.SaleReturnEffects.Single().Id;
            var saleReturnId = scope.Context.SaleReturns.Single().Id;
            var stockBefore = scope.Context.Products.Single(x => x.Id == scenario.Product.Id).Stock;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
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
            var effect = verify.SaleReturnEffects.Single();

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

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsOut = new GoodsEffectDto { Quantity = 5 } },
            }, CancellationToken.None);

            var effectId = scope.Context.SaleReturnEffects.Single().Id;
            var saleReturnId = scope.Context.SaleReturns.Single().Id;
            var stockBefore = scope.Context.Products.Single(x => x.Id == scenario.Product.Id).Stock;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
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

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsIn = new GoodsEffectDto { Quantity = 5 } },
            }, CancellationToken.None);

            var effectId = scope.Context.SaleReturnEffects.Single().Id;
            var resolutionId = scope.Context.SaleReturnResolutions.Single().Id;
            var saleReturnId = scope.Context.SaleReturns.Single().Id;

            var roundHandler = new ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);
            await roundHandler.Handle(new ExecuteGoodsRoundCommand
            {
                SaleReturnId = saleReturnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 1 } },
            }, CancellationToken.None);

            var removeHandler = new RemoveClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => removeHandler.Handle(new RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None));
        }

        [Fact]
        public async Task RemoveClaimResolution_MoneyOnly_RollsBackSettledQuantity()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await SeedShippedWithClaim(scope);

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, Money = new MoneyEffectDto { Kind = ReturnEffectKindEnum.MONEY_OUT, Method = ReturnPaymentMethodEnum.CASH, Amount = 500 } },
            }, CancellationToken.None);

            var resolutionId = scope.Context.SaleReturnResolutions.Single().Id;

            var removeHandler = new RemoveClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
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

            var handler = new CancelSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
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

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, Money = new MoneyEffectDto { Kind = ReturnEffectKindEnum.MONEY_OUT, Method = ReturnPaymentMethodEnum.CASH, Amount = 500 } },
            }, CancellationToken.None);

            var returnId = scope.Context.SaleReturns.Single().Id;
            var handler = new CancelSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CancelSaleReturnCommand { Id = returnId }, CancellationToken.None));
        }

        [Fact]
        public async Task RejectThenReopen_GoesBackToOpen()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, claimId) = await SeedShippedWithClaim(scope);
            var returnId = scope.Context.SaleReturns.Single().Id;

            var rejectHandler = new RejectSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await rejectHandler.Handle(new RejectSaleReturnCommand { Id = returnId }, CancellationToken.None);

            using (var verify = db.NewContext())
                Assert.Equal(ReturnStatusEnum.REJECTED, verify.SaleReturns.Single().Status);

            using var reopenScope = db.NewScope();
            var reopenHandler = new ReopenSaleReturnCommandHandler(reopenScope.Db, reopenScope.SaleReturnQueryService, reopenScope.UnitOfWork);
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

            var handler = new DeleteSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new DeleteSaleReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.SaleReturns.Single().IsActive);
            Assert.NotEmpty(verify.SaleReturnClaims);

            using var readScope = db.NewScope();
            var detailHandler = new GetSaleReturnDetailQueryHandler(readScope.Db, readScope.SaleReturnQueryService, readScope.SaleReturnCalculation);
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
            var handler = new GetSaleReturnDetailQueryHandler(readScope.Db, readScope.SaleReturnQueryService, readScope.SaleReturnCalculation);
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

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 5, GoodsIn = new GoodsEffectDto { Quantity = 5 } },
            }, CancellationToken.None);

            var handler = new GetSaleReturnPendingEffectsQueryHandler(scope.Db, scope.SaleReturnQueryService);
            var res = await handler.Handle(new GetSaleReturnPendingEffectsQuery { SaleId = scenario.Sale.Id }, CancellationToken.None);

            var list = ((System.Collections.Generic.IEnumerable<PendingEffectDto>)res.Data!.GetType().GetProperty("PendingEffects")!.GetValue(res.Data)!).ToList();
            var pending = Assert.Single(list);
            Assert.Equal(ReturnEffectKindEnum.GOODS_IN, pending.Kind);
        }
    }
}
