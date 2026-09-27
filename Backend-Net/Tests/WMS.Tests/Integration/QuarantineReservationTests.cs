using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.PurchaseReturn.Queries;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// The source of goods leaving our hands is stated with the decision (2026-09-27), so quarantine units are reserved from that
    /// moment: a second decision cannot promise the same units, a shelf-sourced one reserves nothing, and the goods round takes the
    /// decision's source instead of asking again.
    /// </summary>
    public class QuarantineReservationTests
    {
        private static PR.AddClaimResolutionCommandHandler Add(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);
        private static PR.ExecuteGoodsRoundCommandHandler Round(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, s.ProductUnitService, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);

        /// <summary>10 ordered, 10 arrived, 3 of them defective: 7 on the shelf, 3 in quarantine on the line. One ON_ORDER claim for 3.</summary>
        private static async Task<(PurchaseScenario scenario, int claimId)> ThreeInQuarantine(TestScope scope, int claimQuantity = 3)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1000);
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 10, Defects = new() { new ReceivingDefectDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = 3 } } } },
                }, CancellationToken.None);

            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Claims = new()
                    {
                        new CreateReturnClaimDto
                        {
                            Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id,
                            UnitPrice = 1000, Quantity = claimQuantity, Problem = ReturnProblemEnum.DEFECTIVE,
                        },
                    },
                }, CancellationToken.None);

            return (scenario, scope.Context.PurchaseReturnClaims.Single().Id);
        }

        private static Task Decide(TestScope scope, int claimId, EffectCompositionDto composition) =>
            Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claimId, Composition = composition }, CancellationToken.None);

        [Fact]
        public async Task QuarantineSourcedDecision_ReservesItsUnits_ForLaterDecisions()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await ThreeInQuarantine(scope);

            await Decide(scope, claimId, new EffectCompositionDto
            {
                Quantity = 2,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 2, Source = ProductUnitStatusEnum.QUARANTINED } },
            });

            // 3 held, 2 promised: a release of 2 does not fit, a release of 1 does.
            await Assert.ThrowsAsync<ValidationCustomException>(() => Decide(scope, claimId, new EffectCompositionDto
            {
                Quantity = 1,
                GoodsRelease = new() { new QuarantineEffectDto { Quantity = 2 } },
            }));
            await Decide(scope, claimId, new EffectCompositionDto
            {
                Quantity = 1,
                GoodsRelease = new() { new QuarantineEffectDto { Quantity = 1 } },
            });

            var info = await new GetPurchaseReceivingInfoQueryHandler(scope.Db, FakeObjectStorage.Instance, scope.PurchaseReturnCalculation)
                .Handle(new GetPurchaseReceivingInfoQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None);
            Assert.Equal(0, Assert.IsType<PurchaseReceivingInfoDto>(info.Data).Items.Single().FreeQuarantinedOnOrderQuantity);
        }

        [Fact]
        public async Task ShelfSourcedDecision_ReservesNothingInQuarantine()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await ThreeInQuarantine(scope, claimQuantity: 5);

            await Decide(scope, claimId, new EffectCompositionDto
            {
                Quantity = 2,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 2, Source = ProductUnitStatusEnum.IN_STOCK } },
            });

            // All 3 quarantined units are still free.
            await Decide(scope, claimId, new EffectCompositionDto
            {
                Quantity = 3,
                GoodsRelease = new() { new QuarantineEffectDto { Quantity = 3 } },
            });

            using var verify = db.NewContext();
            Assert.Equal(ProductUnitStatusEnum.IN_STOCK, verify.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_OUT).Source);
            Assert.Equal(ProductUnitStatusEnum.QUARANTINED, verify.PurchaseReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_RELEASE).Source);
        }

        [Fact]
        public async Task GoodsRound_TakesTheDecisionsSource_AndRefusesADifferentOne()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await ThreeInQuarantine(scope);

            await Decide(scope, claimId, new EffectCompositionDto
            {
                Quantity = 2,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 2, Source = ProductUnitStatusEnum.QUARANTINED } },
            });
            var returnId = scope.Context.PurchaseReturns.Single().Id;
            var effectId = scope.Context.PurchaseReturnEffects.Single().Id;

            await Assert.ThrowsAsync<ValidationCustomException>(() => Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = returnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 1, Source = ProductUnitStatusEnum.IN_STOCK } },
            }, CancellationToken.None));

            // No source sent: the decision's is used - quarantine, stock untouched.
            await Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = returnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = effectId, Quantity = 2 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(7, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
            Assert.Equal(2, verify.ProductUnits.Count(u => u.ProductId == scenario.Product.Id && u.Status == ProductUnitStatusEnum.RETURNED_TO_SUPPLIER));
            Assert.Equal(1, verify.ProductUnits.Count(u => u.ProductId == scenario.Product.Id && u.Status == ProductUnitStatusEnum.QUARANTINED));
        }

        [Fact]
        public void Validator_GoodsOutNeedsASource_GoodsInMustNotHaveOne()
        {
            var purchase = new PR.AddClaimResolutionCommandValidator();
            Assert.False(purchase.Validate(new PR.AddClaimResolutionCommand { ClaimId = 1, Composition = new EffectCompositionDto { Quantity = 1, GoodsOut = new() { new GoodsEffectDto { Quantity = 1 } } } }).IsValid);
            Assert.True(purchase.Validate(new PR.AddClaimResolutionCommand { ClaimId = 1, Composition = new EffectCompositionDto { Quantity = 1, GoodsOut = new() { new GoodsEffectDto { Quantity = 1, Source = ProductUnitStatusEnum.QUARANTINED } } } }).IsValid);
            Assert.False(purchase.Validate(new PR.AddClaimResolutionCommand { ClaimId = 1, Composition = new EffectCompositionDto { Quantity = 1, GoodsIn = new() { new GoodsEffectDto { Quantity = 1, Source = ProductUnitStatusEnum.IN_STOCK } } } }).IsValid);
            Assert.False(purchase.Validate(new PR.AddClaimResolutionCommand { ClaimId = 1, Composition = new EffectCompositionDto { Quantity = 1, GoodsRelease = new() { new QuarantineEffectDto { Quantity = 1, Source = ProductUnitStatusEnum.IN_STOCK } } } }).IsValid);

            var sale = new Application.Features.SaleReturn.Commands.AddClaimResolutionCommandValidator();
            Assert.False(sale.Validate(new Application.Features.SaleReturn.Commands.AddClaimResolutionCommand { ClaimId = 1, Composition = new EffectCompositionDto { Quantity = 1, GoodsOut = new() { new GoodsEffectDto { Quantity = 1, Source = ProductUnitStatusEnum.IN_STOCK } } } }).IsValid);
        }
    }
}
