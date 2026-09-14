using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Shipment.Commands;
using Application.Ioc;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;
using SR = Application.Features.SaleReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// One vehicle, one transaction: the wrapping commands send the existing commands through the real MediatR pipeline (validators
    /// included) and commit all of them or none.
    /// </summary>
    public class ShipmentTests
    {
        /// <summary>The real application pipeline over the scope's own context and services, as registered Scoped in production.</summary>
        private static IMediator Mediator(TestScope scope)
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddApplicationServices();
            services.AddSingleton<IWMSDbContext>(scope.Context);
            services.AddSingleton(scope.UnitOfWork);
            services.AddSingleton(scope.PurchaseReturnCalculation);
            services.AddSingleton(scope.SaleReturnCalculation);
            services.AddSingleton(scope.PurchaseReturnRepository);
            services.AddSingleton(scope.SaleReturnRepository);
            services.AddSingleton(scope.ProductUnitService);
            services.AddSingleton(scope.InventoryCostingService);
            services.AddSingleton(scope.ProductCodeService);
            services.AddSingleton<IObjectStorageService>(FakeObjectStorage.Instance);
            services.AddSingleton(FakeUserContext.WithUserId());
            return services.BuildServiceProvider().GetRequiredService<IMediator>();
        }

        private static async Task<(PurchaseScenario scenario, int returnId, int goodsInEffectId)> PurchaseWithPendingReplacement(TestScope scope)
        {
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand { PurchaseId = s.Purchase.Id, Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = s.Item.Id, ArrivedQuantity = 5 } } }, CancellationToken.None);

            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = s.Purchase.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = s.Item.Id, ProductId = s.Product.Id, UnitPrice = s.Item.UnitPrice, Quantity = 2, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);

            await new PR.AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.AddClaimResolutionCommand { ClaimId = scope.Context.PurchaseReturnClaims.Single().Id, Composition = new EffectCompositionDto { Quantity = 2, GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 0 } } } }, CancellationToken.None);

            return (s, scope.Context.PurchaseReturns.Single().Id, scope.Context.PurchaseReturnEffects.Single().Id);
        }

        [Fact]
        public async Task ReceiveShipment_OrderLinesAndReturnReplacement_AreRecordedTogether()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (s, returnId, effectId) = await PurchaseWithPendingReplacement(scope);

            await Mediator(scope).Send(new ReceiveShipmentCommand
            {
                Purchase = new ReceivePurchaseCommand { PurchaseId = s.Purchase.Id, Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = s.Item.Id, ArrivedQuantity = 3 } } },
                PurchaseReturnRounds = new() { new PR.ExecuteGoodsRoundCommand { PurchaseReturnId = returnId, Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 2 } } } },
            });

            using var verify = db.NewContext();
            Assert.Equal(8, verify.PurchaseItems.Single(x => x.Id == s.Item.Id).ReceivedQuantity);
            Assert.Equal(10, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(ReturnEffectStatusEnum.APPLIED, verify.PurchaseReturnEffects.Single().Status);
        }

        [Fact]
        public async Task ReceiveShipment_WhenALaterPartFails_RollsBackTheEarlierPart()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (s, returnId, effectId) = await PurchaseWithPendingReplacement(scope);

            // The return round asks for more than the effect still owes, after the purchase receiving already saved.
            await Assert.ThrowsAsync<ValidationCustomException>(() => Mediator(scope).Send(new ReceiveShipmentCommand
            {
                Purchase = new ReceivePurchaseCommand { PurchaseId = s.Purchase.Id, Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = s.Item.Id, ArrivedQuantity = 3 } } },
                PurchaseReturnRounds = new() { new PR.ExecuteGoodsRoundCommand { PurchaseReturnId = returnId, Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 5 } } } },
            }));

            using var verify = db.NewContext();
            Assert.Equal(5, verify.PurchaseItems.Single(x => x.Id == s.Item.Id).ReceivedQuantity);
            Assert.Equal(5, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(5, verify.ProductUnits.Count(u => u.ProductId == s.Product.Id));
        }

        [Fact]
        public async Task ReceiveShipment_WithAnOutboundEffect_IsRefusedBeforeAnythingRuns()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (s, returnId, _) = await PurchaseWithPendingReplacement(scope);

            // Make the pending effect an outbound one, so only the direction guard can refuse the receipt.
            var outEffect = scope.Context.PurchaseReturnEffects.Single();
            outEffect.Direction = ReturnEffectDirectionEnum.GOODS_OUT;
            scope.Context.SaveChanges();
            var outEffectId = outEffect.Id;

            await Assert.ThrowsAsync<ValidationCustomException>(() => Mediator(scope).Send(new ReceiveShipmentCommand
            {
                Purchase = new ReceivePurchaseCommand { PurchaseId = s.Purchase.Id, Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = s.Item.Id, ArrivedQuantity = 3 } } },
                PurchaseReturnRounds = new() { new PR.ExecuteGoodsRoundCommand { PurchaseReturnId = returnId, Rounds = new() { new GoodsRoundLineDto { EffectId = outEffectId, Quantity = 1, Source = ProductUnitStatusEnum.IN_STOCK } } } },
            }));

            using var verify = db.NewContext();
            Assert.Equal(5, verify.PurchaseItems.Single(x => x.Id == s.Item.Id).ReceivedQuantity);
        }

        [Fact]
        public async Task DispatchShipment_SaleLinesAndReturnReplacement_AreRecordedTogether()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 3, stock: 10);

            await new SR.CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork)
                .Handle(new SR.CreateSaleReturnCommand
                {
                    SaleId = s.Sale.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = s.Item.Id, ProductId = s.Product.Id, UnitPrice = s.Item.UnitPrice, Quantity = 1, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);

            await new SR.AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork)
                .Handle(new SR.AddClaimResolutionCommand { ClaimId = scope.Context.SaleReturnClaims.Single().Id, Composition = new EffectCompositionDto { Quantity = 1, GoodsOut = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 0 } } } }, CancellationToken.None);

            await Mediator(scope).Send(new DispatchShipmentCommand
            {
                Sale = new ShipSaleCommand { SaleId = s.Sale.Id, Items = new() { new ShipSaleItemDto { SaleItemId = s.Item.Id, ShippedQuantity = 2 } } },
                SaleReturnRounds = new() { new SR.ExecuteGoodsRoundCommand { SaleReturnId = scope.Context.SaleReturns.Single().Id, Rounds = new() { new GoodsRoundLineDto { EffectId = scope.Context.SaleReturnEffects.Single().Id, Quantity = 1 } } } },
            });

            using var verify = db.NewContext();
            Assert.Equal(5, verify.SaleItems.Single(x => x.Id == s.Item.Id).ShippedQuantity);
            Assert.Equal(7, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(ReturnEffectStatusEnum.APPLIED, verify.SaleReturnEffects.Single().Status);
        }
    }
}
