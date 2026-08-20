using Application.Features.SaleReturn.Commands;
using Application.Features.SaleReturn.Dtos;
using Application.Features.SaleReturn.Queries;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class SaleReturnLifecycleExtraTests
    {
        private static async Task<(SaleScenario scenario, int saleReturnId, int claimId)> SeedClaim(TestScope scope, int shippedQuantity = 10, int claimedQuantity = 5)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: shippedQuantity, shippedQuantity: shippedQuantity, stock: 0);

            var handler = new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
                Claims = new() { new CreateSaleReturnClaimDto { SaleItemId = scenario.Item.Id, Reason = SalesReturnReasonEnum.DEFECTIVE, ClaimedQuantity = claimedQuantity } },
            }, CancellationToken.None);

            var claim = scope.Context.SaleReturnClaims.Single();
            return (scenario, claim.SaleReturnId, claim.Id);
        }

        private static async Task<(SaleScenario scenario, int saleReturnId, int saleReturnItemId)> SeedInspectedHealthy(TestScope scope, int shippedQuantity = 10, int claimedQuantity = 5)
        {
            var (scenario, saleReturnId, claimId) = await SeedClaim(scope, shippedQuantity, claimedQuantity);

            var inspectHandler = new ConfirmReturnInspectionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.ProductUnitService, scope.UnitOfWork);
            await inspectHandler.Handle(new ConfirmReturnInspectionCommand
            {
                SaleReturnId = saleReturnId,
                Claims = new()
                {
                    new ConfirmReturnInspectionClaimDto
                    {
                        SaleReturnClaimId = claimId,
                        Results = new() { new ConfirmReturnInspectionResultDto { IssueType = SalesReturnIssueTypeEnum.DEFECTIVE, Quantity = claimedQuantity } },
                    },
                },
            }, CancellationToken.None);

            var itemId = scope.Context.SaleReturnItems.Single().Id;
            return (scenario, saleReturnId, itemId);
        }

        [Fact]
        public async Task CancelSaleReturn_PreInspection_MarksCancelled()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId, _) = await SeedClaim(scope);

            var handler = new CancelSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new CancelSaleReturnCommand { Id = saleReturnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(SaleReturnStatusEnum.CANCELLED, verify.SaleReturns.Single(x => x.Id == saleReturnId).Status);
        }

        [Fact]
        public async Task CancelSaleReturn_AfterInspection_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId, _) = await SeedInspectedHealthy(scope);

            var handler = new CancelSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CancelSaleReturnCommand { Id = saleReturnId }, CancellationToken.None));
        }

        [Fact]
        public async Task RejectSaleReturn_PreInspection_MarksRejected()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId, _) = await SeedClaim(scope);

            var handler = new RejectSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new RejectSaleReturnCommand { Id = saleReturnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(SaleReturnStatusEnum.REJECTED, verify.SaleReturns.Single(x => x.Id == saleReturnId).Status);
        }

        [Fact]
        public async Task ReopenSaleReturn_RejectedReturn_GoesBackToPendingInspection()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId, _) = await SeedClaim(scope);

            var rejectHandler = new RejectSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await rejectHandler.Handle(new RejectSaleReturnCommand { Id = saleReturnId }, CancellationToken.None);

            var reopenHandler = new ReopenSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await reopenHandler.Handle(new ReopenSaleReturnCommand { Id = saleReturnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(SaleReturnStatusEnum.PENDING_INSPECTION, verify.SaleReturns.Single(x => x.Id == saleReturnId).Status);
        }

        [Fact]
        public async Task ReopenSaleReturn_NonRejectedReturn_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId, _) = await SeedClaim(scope);

            var handler = new ReopenSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new ReopenSaleReturnCommand { Id = saleReturnId }, CancellationToken.None));
        }

        [Fact]
        public async Task DeleteSaleReturn_PreInspection_HardDeletesWithCascade()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId, _) = await SeedClaim(scope);

            var handler = new DeleteSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);
            await handler.Handle(new DeleteSaleReturnCommand { Id = saleReturnId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Empty(verify.SaleReturns);
            Assert.Empty(verify.SaleReturnClaims);
        }

        [Fact]
        public async Task DeleteSaleReturn_AfterInspection_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId, _) = await SeedInspectedHealthy(scope);

            var handler = new DeleteSaleReturnCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new DeleteSaleReturnCommand { Id = saleReturnId }, CancellationToken.None));
        }

        [Fact]
        public async Task RemoveSaleReturnDecision_AwaitingReplacement_RemovesIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, saleReturnId, saleReturnItemId) = await SeedInspectedHealthy(scope);

            var addHandler = new AddSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddSaleReturnDecisionCommand { SaleReturnItemId = saleReturnItemId, DecisionType = SaleReturnDecisionTypeEnum.REPLACEMENT, Quantity = 5 }, CancellationToken.None);

            var decisionId = scope.Context.SaleReturnDecisions.Single().Id;

            var removeHandler = new RemoveSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await removeHandler.Handle(new RemoveSaleReturnDecisionCommand { Id = decisionId }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Empty(verify.SaleReturnDecisions);
            Assert.Equal(SaleReturnStatusEnum.COORDINATING, verify.SaleReturns.Single(x => x.Id == saleReturnId).Status);
        }

        [Fact]
        public async Task RemoveSaleReturnDecision_ResolvedDecision_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, _, saleReturnItemId) = await SeedInspectedHealthy(scope);

            var addHandler = new AddSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddSaleReturnDecisionCommand { SaleReturnItemId = saleReturnItemId, DecisionType = SaleReturnDecisionTypeEnum.REFUND, Quantity = 5 }, CancellationToken.None);

            var decisionId = scope.Context.SaleReturnDecisions.Single().Id;

            var removeHandler = new RemoveSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => removeHandler.Handle(new RemoveSaleReturnDecisionCommand { Id = decisionId }, CancellationToken.None));
        }

        [Fact]
        public async Task ConfirmReplacementShipment_PartialThenFull_ResolvesDecisionAndDecrementsStock()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, _, saleReturnItemId) = await SeedInspectedHealthy(scope, shippedQuantity: 10, claimedQuantity: 5);

            // Give the product some stock to ship the replacement from, with matching ProductUnit
            // rows so the Stock/ProductUnit invariant holds and ConsumeAsync has units to take.
            var product = scope.Context.Products.Single(x => x.Id == scenario.Product.Id);
            product.Stock = 20;
            scope.Context.SaveChanges();
            Seed.MintUnits(scope.Context, product, 20);

            var addHandler = new AddSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddSaleReturnDecisionCommand { SaleReturnItemId = saleReturnItemId, DecisionType = SaleReturnDecisionTypeEnum.REPLACEMENT, Quantity = 5 }, CancellationToken.None);
            var decisionId = scope.Context.SaleReturnDecisions.Single().Id;

            var shipHandler = new ConfirmReplacementShipmentCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.ProductUnitService, scope.UnitOfWork);
            await shipHandler.Handle(new ConfirmReplacementShipmentCommand { SaleReturnDecisionId = decisionId, ShippedQuantity = 3 }, CancellationToken.None);

            using (var mid = db.NewContext())
            {
                var decision = mid.SaleReturnDecisions.Single(x => x.Id == decisionId);
                Assert.Equal(SaleReturnDecisionStatusEnum.AWAITING, decision.Status);
                Assert.Equal(3, decision.ReplacementShippedQuantity);
                Assert.Equal(17, mid.Products.Single(x => x.Id == scenario.Product.Id).Stock);
            }

            await shipHandler.Handle(new ConfirmReplacementShipmentCommand { SaleReturnDecisionId = decisionId, ShippedQuantity = 2 }, CancellationToken.None);

            using var verify = db.NewContext();
            var finalDecision = verify.SaleReturnDecisions.Single(x => x.Id == decisionId);
            Assert.Equal(SaleReturnDecisionStatusEnum.RESOLVED, finalDecision.Status);
            Assert.Equal(15, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task ConfirmReplacementShipment_ExceedingRemainingQuantity_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, _, saleReturnItemId) = await SeedInspectedHealthy(scope, shippedQuantity: 10, claimedQuantity: 5);
            var product = scope.Context.Products.Single(x => x.Id == scenario.Product.Id);
            product.Stock = 20;
            scope.Context.SaveChanges();
            Seed.MintUnits(scope.Context, product, 20);

            var addHandler = new AddSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddSaleReturnDecisionCommand { SaleReturnItemId = saleReturnItemId, DecisionType = SaleReturnDecisionTypeEnum.REPLACEMENT, Quantity = 5 }, CancellationToken.None);
            var decisionId = scope.Context.SaleReturnDecisions.Single().Id;

            var shipHandler = new ConfirmReplacementShipmentCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.ProductUnitService, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => shipHandler.Handle(new ConfirmReplacementShipmentCommand { SaleReturnDecisionId = decisionId, ShippedQuantity = 6 }, CancellationToken.None));
        }

        [Fact]
        public async Task ConfirmReplacementShipment_InsufficientStock_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, _, saleReturnItemId) = await SeedInspectedHealthy(scope, shippedQuantity: 10, claimedQuantity: 5);
            var product = scope.Context.Products.Single(x => x.Id == scenario.Product.Id);
            product.Stock = 2; // less than the 5-unit replacement
            scope.Context.SaveChanges();

            var addHandler = new AddSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddSaleReturnDecisionCommand { SaleReturnItemId = saleReturnItemId, DecisionType = SaleReturnDecisionTypeEnum.REPLACEMENT, Quantity = 5 }, CancellationToken.None);
            var decisionId = scope.Context.SaleReturnDecisions.Single().Id;

            var shipHandler = new ConfirmReplacementShipmentCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.ProductUnitService, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => shipHandler.Handle(new ConfirmReplacementShipmentCommand { SaleReturnDecisionId = decisionId, ShippedQuantity = 5 }, CancellationToken.None));
        }

        [Fact]
        public async Task GetReplacementShippingQueue_ListsOnlyAwaitingReplacements()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, _, saleReturnItemId) = await SeedInspectedHealthy(scope, shippedQuantity: 10, claimedQuantity: 5);
            var product = scope.Context.Products.Single(x => x.Id == scenario.Product.Id);
            product.Stock = 20;
            scope.Context.SaveChanges();
            Seed.MintUnits(scope.Context, product, 20);

            var addHandler = new AddSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await addHandler.Handle(new AddSaleReturnDecisionCommand { SaleReturnItemId = saleReturnItemId, DecisionType = SaleReturnDecisionTypeEnum.REPLACEMENT, Quantity = 5 }, CancellationToken.None);

            var handler = new GetReplacementShippingQueueQueryHandler(scope.Db);
            var res = await handler.Handle(new GetReplacementShippingQueueQuery(), CancellationToken.None);

            var list = Assert.IsAssignableFrom<System.Collections.Generic.List<ReplacementShippingQueueItemDto>>(res.Data);
            var entry = Assert.Single(list);
            Assert.Equal(5, entry.Quantity);
            Assert.Equal(0, entry.ShippedQuantity);
        }

        [Fact]
        public async Task GetSaleReturnInspectionInfo_ListsUninspectedClaims()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, _, _) = await SeedClaim(scope, shippedQuantity: 10, claimedQuantity: 5);

            var handler = new GetSaleReturnInspectionInfoQueryHandler(scope.Db, scope.SaleReturnQueryService);
            var res = await handler.Handle(new GetSaleReturnInspectionInfoQuery { SaleId = scenario.Sale.Id }, CancellationToken.None);

            var dto = Assert.IsType<SaleReturnInspectionInfoDto>(res.Data);
            var claim = Assert.Single(dto.Claims);
            Assert.Equal(5, claim.UninspectedQuantity);
        }
    }
}
