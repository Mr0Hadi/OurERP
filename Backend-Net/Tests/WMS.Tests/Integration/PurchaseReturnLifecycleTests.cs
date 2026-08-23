using Application.Features.Purchase.Commands;
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
        private static async Task<(PurchaseScenario scenario, int returnId, int returnItemId)> SeedShortageReturn(TestScope scope, int ordered = 10, int shortageQty = 4)
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

            var returnItem = scope.Context.PurchaseReturnItems.Single();
            return (scenario, returnItem.PurchaseReturnId, returnItem.Id);
        }

        [Fact]
        public async Task CancelPurchaseReturn_PendingReturn_MarksCancelled()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, _) = await SeedShortageReturn(scope);

            var handler = new CancelPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(PurchaseReturnStatusEnum.CANCELLED, verify.PurchaseReturns.Single(x => x.Id == returnId).Status);
        }

        [Fact]
        public async Task CancelPurchaseReturn_AfterDecisionRegistered_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, returnItemId) = await SeedShortageReturn(scope);

            var decisionHandler = new AddPurchaseReturnDecisionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await decisionHandler.Handle(new AddPurchaseReturnDecisionCommand { PurchaseReturnItemId = returnItemId, DecisionType = PurchaseReturnDecisionTypeEnum.REFUND, Quantity = 4 }, CancellationToken.None);

            var cancelHandler = new CancelPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => cancelHandler.Handle(new CancelPurchaseReturnCommand { Id = returnId }, CancellationToken.None));
        }

        [Fact]
        public async Task RejectPurchaseReturn_PendingReturn_MarksRejected()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, _) = await SeedShortageReturn(scope);

            var handler = new RejectPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new RejectPurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(PurchaseReturnStatusEnum.REJECTED, verify.PurchaseReturns.Single(x => x.Id == returnId).Status);
        }

        [Fact]
        public async Task ReopenPurchaseReturn_RejectedReturn_GoesBackToPending()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, _) = await SeedShortageReturn(scope);

            var rejectHandler = new RejectPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await rejectHandler.Handle(new RejectPurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            var reopenHandler = new ReopenPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await reopenHandler.Handle(new ReopenPurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(PurchaseReturnStatusEnum.PENDING, verify.PurchaseReturns.Single(x => x.Id == returnId).Status);
        }

        [Fact]
        public async Task ReopenPurchaseReturn_NonRejectedReturn_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, _) = await SeedShortageReturn(scope);

            var handler = new ReopenPurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new ReopenPurchaseReturnCommand { Id = returnId }, CancellationToken.None));
        }

        [Fact]
        public async Task DeletePurchaseReturn_PendingReturn_HardDeletesWithCascade()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, _) = await SeedShortageReturn(scope);

            var handler = new DeletePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new DeletePurchaseReturnCommand { Id = returnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Empty(verify.PurchaseReturns);
            Assert.Empty(verify.PurchaseReturnItems);
        }

        [Fact]
        public async Task DeletePurchaseReturn_AfterDecisionRegistered_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, returnItemId) = await SeedShortageReturn(scope);

            var decisionHandler = new AddPurchaseReturnDecisionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await decisionHandler.Handle(new AddPurchaseReturnDecisionCommand { PurchaseReturnItemId = returnItemId, DecisionType = PurchaseReturnDecisionTypeEnum.REPLACEMENT, Quantity = 4 }, CancellationToken.None);

            var deleteHandler = new DeletePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => deleteHandler.Handle(new DeletePurchaseReturnCommand { Id = returnId }, CancellationToken.None));
        }

        [Fact]
        public async Task RemovePurchaseReturnDecision_AwaitingReplacement_RemovesAndRecomputesStatus()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, returnItemId) = await SeedShortageReturn(scope);

            var addHandler = new AddPurchaseReturnDecisionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddPurchaseReturnDecisionCommand { PurchaseReturnItemId = returnItemId, DecisionType = PurchaseReturnDecisionTypeEnum.REPLACEMENT, Quantity = 4 }, CancellationToken.None);

            var decisionId = scope.Context.PurchaseReturnDecisions.Single().Id;

            var removeHandler = new RemovePurchaseReturnDecisionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await removeHandler.Handle(new RemovePurchaseReturnDecisionCommand { Id = decisionId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Empty(verify.PurchaseReturnDecisions);
            Assert.Equal(PurchaseReturnStatusEnum.PENDING, verify.PurchaseReturns.Single(x => x.Id == returnId).Status);
        }

        [Fact]
        public async Task RemovePurchaseReturnDecision_ResolvedDecision_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, _, returnItemId) = await SeedShortageReturn(scope);

            var addHandler = new AddPurchaseReturnDecisionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddPurchaseReturnDecisionCommand { PurchaseReturnItemId = returnItemId, DecisionType = PurchaseReturnDecisionTypeEnum.REFUND, Quantity = 4 }, CancellationToken.None);

            var decisionId = scope.Context.PurchaseReturnDecisions.Single().Id;

            var removeHandler = new RemovePurchaseReturnDecisionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => removeHandler.Handle(new RemovePurchaseReturnDecisionCommand { Id = decisionId }, CancellationToken.None));
        }

        [Fact]
        public async Task GetPurchaseReturnDetail_ReturnsFlagsAndTotals()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, _) = await SeedShortageReturn(scope, ordered: 10, shortageQty: 4);

            var handler = new GetPurchaseReturnDetailQueryHandler(scope.Db, FakeObjectStorage.Instance);
            var res = await handler.Handle(new GetPurchaseReturnDetailQuery { Id = returnId }, CancellationToken.None);

            var dto = Assert.IsType<PurchaseReturnDetailDto>(res.Data);
            Assert.True(dto.CanCancel);
            Assert.True(dto.CanReject);
            Assert.True(dto.CanDelete);
            Assert.False(dto.CanReopen);
            Assert.Equal(4, dto.TotalQuantity);
        }

        [Fact]
        public async Task GetPurchaseReturnList_FiltersByReason()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            await SeedShortageReturn(scope);

            var handler = new GetPurchaseReturnListQueryHandler(scope.Db);
            var matching = await handler.Handle(new GetPurchaseReturnListQuery { Reason = PurchaseIssueTypeEnum.SHORTAGE }, CancellationToken.None);
            var nonMatching = await handler.Handle(new GetPurchaseReturnListQuery { Reason = PurchaseIssueTypeEnum.EXCESS }, CancellationToken.None);

            var matchingList = (System.Collections.IEnumerable)matching.Data!.GetType().GetProperty("ReturnList")!.GetValue(matching.Data)!;
            var nonMatchingList = (System.Collections.IEnumerable)nonMatching.Data!.GetType().GetProperty("ReturnList")!.GetValue(nonMatching.Data)!;

            Assert.Single(matchingList.Cast<object>());
            Assert.Empty(nonMatchingList.Cast<object>());
        }
    }
}
