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
        private static async Task<(SaleScenario scenario, int saleReturnId)> SeedClaim(TestScope scope, int shippedQuantity = 10, int claimedQuantity = 5)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: shippedQuantity, shippedQuantity: shippedQuantity, stock: 0);

            var handler = new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);
            var res = await handler.Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
                Claims = new()
                {
                    new CreateSaleReturnClaimDto { SaleItemId = scenario.Item.Id, Reason = SalesReturnReasonEnum.DEFECTIVE, ClaimedQuantity = claimedQuantity },
                },
            }, CancellationToken.None);

            var data = res.Data!;
            var returnId = (int)data.GetType().GetProperty("ReturnId")!.GetValue(data)!;
            return (scenario, returnId);
        }

        [Fact]
        public async Task CreateSaleReturn_ClaimingMoreThanShipped_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0);

            var handler = new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
                Claims = new() { new CreateSaleReturnClaimDto { SaleItemId = scenario.Item.Id, Reason = SalesReturnReasonEnum.DEFECTIVE, ClaimedQuantity = 6 } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateSaleReturn_OnPendingSale_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 0, stock: 0);
            scenario.Sale.Status = SalesStatusEnum.PENDING;
            scope.Context.SaveChanges();

            var handler = new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
                Claims = new() { new CreateSaleReturnClaimDto { SaleItemId = scenario.Item.Id, Reason = SalesReturnReasonEnum.DEFECTIVE, ClaimedQuantity = 1 } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task CreateSaleReturn_SecondConcurrentClaim_RespectsRemainingBudget()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, _) = await SeedClaim(scope, shippedQuantity: 10, claimedQuantity: 7);

            var handler = new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);

            // Only 3 units of budget left (10 shipped - 7 already claimed and open).
            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
                Claims = new() { new CreateSaleReturnClaimDto { SaleItemId = scenario.Item.Id, Reason = SalesReturnReasonEnum.WRONG_ITEM, ClaimedQuantity = 4 } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task ConfirmReturnInspection_HealthyResult_RestocksAndCompletesInspection()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, saleReturnId) = await SeedClaim(scope, shippedQuantity: 10, claimedQuantity: 5);
            var claimId = scope.Context.SaleReturnClaims.Single().Id;

            var handler = new ConfirmReturnInspectionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new ConfirmReturnInspectionCommand
            {
                SaleReturnId = saleReturnId,
                Claims = new()
                {
                    new ConfirmReturnInspectionClaimDto
                    {
                        SaleReturnClaimId = claimId,
                        Results = new() { new ConfirmReturnInspectionResultDto { IssueType = null, Quantity = 5 } },
                    },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);
            var saleReturn = verify.SaleReturns.Single();

            Assert.Equal(5, product.Stock); // healthy inspected quantity restocked
            Assert.Equal(SaleReturnStatusEnum.COORDINATING, saleReturn.Status); // fully inspected, no decisions yet
        }

        [Fact]
        public async Task ConfirmReturnInspection_DefectiveResult_DoesNotRestock()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, saleReturnId) = await SeedClaim(scope, shippedQuantity: 10, claimedQuantity: 5);
            var claimId = scope.Context.SaleReturnClaims.Single().Id;

            var handler = new ConfirmReturnInspectionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new ConfirmReturnInspectionCommand
            {
                SaleReturnId = saleReturnId,
                Claims = new()
                {
                    new ConfirmReturnInspectionClaimDto
                    {
                        SaleReturnClaimId = claimId,
                        Results = new() { new ConfirmReturnInspectionResultDto { IssueType = SalesReturnIssueTypeEnum.DEFECTIVE, Quantity = 5 } },
                    },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);

            Assert.Equal(0, product.Stock); // defective quantity never returns to sellable stock
        }

        [Fact]
        public async Task ConfirmReturnInspection_ExceedingClaimedQuantity_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId) = await SeedClaim(scope, shippedQuantity: 10, claimedQuantity: 5);
            var claimId = scope.Context.SaleReturnClaims.Single().Id;

            var handler = new ConfirmReturnInspectionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new ConfirmReturnInspectionCommand
            {
                SaleReturnId = saleReturnId,
                Claims = new()
                {
                    new ConfirmReturnInspectionClaimDto
                    {
                        SaleReturnClaimId = claimId,
                        Results = new() { new ConfirmReturnInspectionResultDto { IssueType = null, Quantity = 6 } },
                    },
                },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task AddSaleReturnDecision_RefundOnDefectiveItem_SettlesAndMarksSaleReturnedWhenComplete()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, saleReturnId) = await SeedClaim(scope, shippedQuantity: 5, claimedQuantity: 5);
            var claimId = scope.Context.SaleReturnClaims.Single().Id;

            var inspectHandler = new ConfirmReturnInspectionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.UnitOfWork);
            await inspectHandler.Handle(new ConfirmReturnInspectionCommand
            {
                SaleReturnId = saleReturnId,
                Claims = new()
                {
                    new ConfirmReturnInspectionClaimDto
                    {
                        SaleReturnClaimId = claimId,
                        Results = new() { new ConfirmReturnInspectionResultDto { IssueType = SalesReturnIssueTypeEnum.DEFECTIVE, Quantity = 5 } },
                    },
                },
            }, CancellationToken.None);

            var saleReturnItemId = scope.Context.SaleReturnItems.Single().Id;

            var decisionHandler = new AddSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.UnitOfWork);
            await decisionHandler.Handle(new AddSaleReturnDecisionCommand
            {
                SaleReturnItemId = saleReturnItemId,
                DecisionType = SaleReturnDecisionTypeEnum.REFUND,
                Quantity = 5,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var saleItem = verify.SaleItems.Single(x => x.Id == scenario.Item.Id);
            var sale = verify.Sales.Single(x => x.Id == scenario.Sale.Id);
            var saleReturn = verify.SaleReturns.Single();

            Assert.Equal(5, saleItem.SettledQuantity);
            Assert.Equal(SalesStatusEnum.RETURNED, sale.Status); // every shipped unit now settled
            Assert.Equal(SaleReturnStatusEnum.RESOLVED, saleReturn.Status);
        }

        [Fact]
        public async Task AddSaleReturnDecision_ReplacementForHealthyLine_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId) = await SeedClaim(scope, shippedQuantity: 5, claimedQuantity: 5);
            var claimId = scope.Context.SaleReturnClaims.Single().Id;

            var inspectHandler = new ConfirmReturnInspectionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.UnitOfWork);
            await inspectHandler.Handle(new ConfirmReturnInspectionCommand
            {
                SaleReturnId = saleReturnId,
                Claims = new()
                {
                    new ConfirmReturnInspectionClaimDto
                    {
                        SaleReturnClaimId = claimId,
                        Results = new() { new ConfirmReturnInspectionResultDto { IssueType = null, Quantity = 5 } },
                    },
                },
            }, CancellationToken.None);

            var saleReturnItemId = scope.Context.SaleReturnItems.Single().Id;
            var decisionHandler = new AddSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => decisionHandler.Handle(new AddSaleReturnDecisionCommand
            {
                SaleReturnItemId = saleReturnItemId,
                DecisionType = SaleReturnDecisionTypeEnum.REPLACEMENT,
                Quantity = 5,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task GetSaleReturnDetailQuery_ReflectsFlagsForPreInspectionReturn()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId) = await SeedClaim(scope, shippedQuantity: 5, claimedQuantity: 3);

            var handler = new GetSaleReturnDetailQueryHandler(scope.Db, scope.SaleReturnCalculation);
            var res = await handler.Handle(new GetSaleReturnDetailQuery { Id = saleReturnId }, CancellationToken.None);

            var dto = Assert.IsType<SaleReturnDetailDto>(res.Data);
            Assert.True(dto.CanCancel);
            Assert.True(dto.CanReject);
            Assert.True(dto.CanDelete);
            Assert.False(dto.CanReopen);
            Assert.Equal(3, dto.TotalQuantity);
        }

        [Fact]
        public async Task GetSaleReturnListQuery_FiltersByStatus()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            await SeedClaim(scope, shippedQuantity: 5, claimedQuantity: 3);

            var handler = new GetSaleReturnListQueryHandler(scope.Db);
            var matching = await handler.Handle(new GetSaleReturnListQuery { Status = SaleReturnStatusEnum.PENDING_INSPECTION }, CancellationToken.None);
            var nonMatching = await handler.Handle(new GetSaleReturnListQuery { Status = SaleReturnStatusEnum.RESOLVED }, CancellationToken.None);

            var matchingData = matching.Data!;
            var nonMatchingData = nonMatching.Data!;
            var matchingList = (System.Collections.IEnumerable)matchingData.GetType().GetProperty("ReturnList")!.GetValue(matchingData)!;
            var nonMatchingList = (System.Collections.IEnumerable)nonMatchingData.GetType().GetProperty("ReturnList")!.GetValue(nonMatchingData)!;

            Assert.Single(matchingList.Cast<object>());
            Assert.Empty(nonMatchingList.Cast<object>());
        }
    }
}
