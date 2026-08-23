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
    public class PurchaseReturnDecisionTests
    {
        private static async Task<(PurchaseScenario scenario, int returnItemId)> SeedShortageReturn(TestScope scope, int ordered = 10, int shortageQty = 4)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: ordered, stock: 0);

            var receiveHandler = new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.ProductUnitService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await receiveHandler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ReceivedQuantity = ordered - shortageQty,
                        Issues = new() { new ReceivePurchaseIssueDto { Type = PurchaseIssueTypeEnum.SHORTAGE, Quantity = shortageQty } },
                    },
                },
            }, CancellationToken.None);

            var returnItemId = scope.Context.PurchaseReturnItems.Single().Id;
            return (scenario, returnItemId);
        }

        [Fact]
        public async Task Handle_RefundDecision_ResolvesImmediatelyAndSettlesQuantity()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, returnItemId) = await SeedShortageReturn(scope);

            var handler = new AddPurchaseReturnDecisionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new AddPurchaseReturnDecisionCommand
            {
                PurchaseReturnItemId = returnItemId,
                DecisionType = PurchaseReturnDecisionTypeEnum.REFUND,
                Quantity = 4,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id);
            var decision = verify.PurchaseReturnItems.Include(x => x.Decisions).Single().Decisions.Single();
            var purchaseReturn = verify.PurchaseReturns.Single();

            Assert.Equal(4, item.SettledQuantity);
            Assert.Equal(PurchaseReturnDecisionStatusEnum.RESOLVED, decision.Status);
            Assert.Equal(4UL * scenario.Item.UnitPrice, decision.RefundAmount);
            Assert.Equal(PurchaseReturnStatusEnum.RESOLVED, purchaseReturn.Status);
        }

        [Fact]
        public async Task Handle_ReplacementDecision_LeavesAwaitingAndDoesNotSettle()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, returnItemId) = await SeedShortageReturn(scope);

            var handler = new AddPurchaseReturnDecisionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new AddPurchaseReturnDecisionCommand
            {
                PurchaseReturnItemId = returnItemId,
                DecisionType = PurchaseReturnDecisionTypeEnum.REPLACEMENT,
                Quantity = 4,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id);
            var decision = verify.PurchaseReturnItems.Include(x => x.Decisions).Single().Decisions.Single();
            var purchaseReturn = verify.PurchaseReturns.Single();

            Assert.Equal(0, item.SettledQuantity);
            Assert.Equal(PurchaseReturnDecisionStatusEnum.AWAITING, decision.Status);
            Assert.Equal(PurchaseReturnStatusEnum.COORDINATING, purchaseReturn.Status);
        }

        [Fact]
        public async Task Handle_InvalidDecisionForIssueType_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            var receiveHandler = new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.ProductUnitService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await receiveHandler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ReceivedQuantity = 3,
                        Issues = new() { new ReceivePurchaseIssueDto { Type = PurchaseIssueTypeEnum.EXCESS, Quantity = 2 } },
                    },
                },
            }, CancellationToken.None);

            var returnItemId = scope.Context.PurchaseReturnItems.Single().Id;
            var handler = new AddPurchaseReturnDecisionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            // EXCESS only allows REFUND or CREDIT, not REPLACEMENT.
            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new AddPurchaseReturnDecisionCommand
            {
                PurchaseReturnItemId = returnItemId,
                DecisionType = PurchaseReturnDecisionTypeEnum.REPLACEMENT,
                Quantity = 2,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_DecidingMoreThanReturnItemQuantity_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnItemId) = await SeedShortageReturn(scope, ordered: 10, shortageQty: 4);

            var handler = new AddPurchaseReturnDecisionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new AddPurchaseReturnDecisionCommand
            {
                PurchaseReturnItemId = returnItemId,
                DecisionType = PurchaseReturnDecisionTypeEnum.REFUND,
                Quantity = 5, // only 4 short
            }, CancellationToken.None));
        }

        [Fact]
        public async Task GetPurchaseReceivingInfoQuery_ReflectsOpenIssueAndReceivableQuantities()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, _) = await SeedShortageReturn(scope, ordered: 10, shortageQty: 4);

            var handler = new GetPurchaseReceivingInfoQueryHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance);
            var res = await handler.Handle(new GetPurchaseReceivingInfoQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None);

            var data = Assert.IsType<PurchaseReceivingInfoDto>(res.Data);
            var itemInfo = data.Items.Single();

            Assert.Equal(4, itemInfo.OpenIssueQuantity);
            Assert.Equal(0, itemInfo.ReceivableQuantity); // 10 ordered - 6 received - 4 open issue
        }
    }
}
