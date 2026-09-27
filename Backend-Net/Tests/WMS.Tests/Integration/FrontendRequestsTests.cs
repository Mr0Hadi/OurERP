using Application.Common.Dtos;
using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.PurchaseReturn.Commands;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.PurchaseReturn.Queries;
using Application.Features.Report.Dtos;
using Application.Features.Report.Queries;
using Application.Features.Sale.Dtos;
using Application.Features.Sale.Queries;
using Application.Features.SaleReturn.Commands;
using Application.Features.SaleReturn.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;
using PRC = Application.Features.PurchaseReturn.Commands;
using SRQ = Application.Features.SaleReturn.Queries;

namespace WMS.Tests.Integration
{
    /// <summary>The backend half of docs/frontend-requests.fa.md (2026-09-27): sections 2, 3 (6, 8, 9), 5 and 6.</summary>
    public class FrontendRequestsTests
    {
        private static List<T> Read<T>(ResponseDto res, string property) =>
            ((IEnumerable<T>)res.Data!.GetType().GetProperty(property)!.GetValue(res.Data)!).ToList();

        private static async Task<(PurchaseScenario scenario, int returnId, int claimId)> SeedPurchaseReturn(TestScope scope)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 10 } },
                }, CancellationToken.None);

            await new CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new CreatePurchaseReturnCommand
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
                            Quantity = 3,
                            Problem = ReturnProblemEnum.DEFECTIVE,
                        },
                    },
                }, CancellationToken.None);

            var claim = scope.Context.PurchaseReturnClaims.Single();
            return (scenario, claim.PurchaseReturnId, claim.Id);
        }

        // --- Section 2 ---

        [Theory]
        [InlineData(null, true)]
        [InlineData("09121234567", true)]
        [InlineData("0012345678", false)] // a national id is not a phone number
        public void GoodsRound_PartyPhoneNumber_IsAnOptionalMobileNumber(string? phone, bool valid)
        {
            var purchaseSide = new PRC.ExecuteGoodsRoundCommandValidator().Validate(new PRC.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = 1,
                PartyPhoneNumber = phone,
                Rounds = new() { new GoodsRoundLineDto { EffectId = 1, Quantity = 1, Source = ProductUnitStatusEnum.IN_STOCK } },
            });
            var saleSide = new Application.Features.SaleReturn.Commands.ExecuteGoodsRoundCommandValidator().Validate(new Application.Features.SaleReturn.Commands.ExecuteGoodsRoundCommand
            {
                SaleReturnId = 1,
                PartyPhoneNumber = phone,
                Rounds = new() { new GoodsRoundLineDto { EffectId = 1, Quantity = 1 } },
            });

            Assert.Equal(valid, purchaseSide.IsValid);
            Assert.Equal(valid, saleSide.IsValid);
        }

        // --- Section 3, items 6 and 8 ---

        [Fact]
        public async Task GetSaleList_FiltersByCustomerId_AndByAnyOfSeveralStatuses()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var product = Seed.Product(category);
            var ali = Seed.Customer("علی", "رضایی");
            var namesake = Seed.Customer("علی", "رضایی");
            scope.Context.Sales.AddRange(
                Seed.Sale(ali, SalesStatusEnum.PROCESSING, Seed.SaleItem(product, 1)),
                Seed.Sale(ali, SalesStatusEnum.PARTIALLY_DELIVERED, Seed.SaleItem(product, 1)),
                Seed.Sale(ali, SalesStatusEnum.DELIVERED, Seed.SaleItem(product, 1)),
                Seed.Sale(namesake, SalesStatusEnum.PROCESSING, Seed.SaleItem(product, 1)));
            scope.Context.SaveChanges();

            var handler = new GetSaleListQueryHandler(scope.Db);
            var byCustomer = Read<SaleListDto>(await handler.Handle(new GetSaleListQuery { CustomerId = ali.Id, Take = 50 }, CancellationToken.None), "SaleList");
            var queue = Read<SaleListDto>(await handler.Handle(new GetSaleListQuery
            {
                CustomerId = ali.Id,
                Statuses = new() { SalesStatusEnum.PROCESSING, SalesStatusEnum.PARTIALLY_DELIVERED },
                Take = 50,
            }, CancellationToken.None), "SaleList");

            Assert.Equal(3, byCustomer.Count);
            Assert.All(byCustomer, x => Assert.Equal(ali.Id, x.CustomerId));
            Assert.Equal(new[] { SalesStatusEnum.PARTIALLY_DELIVERED, SalesStatusEnum.PROCESSING }, queue.Select(x => x.Status).OrderBy(x => x.ToString()));
        }

        // --- Section 3, item 5 ---

        [Fact]
        public async Task GetSaleDetail_CarriesTheClaimCapsCreateSaleReturnEnforces()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 3);
            await new Application.Features.Sale.Commands.ShipSaleCommandHandler(scope.Db, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork)
                .Handle(new Application.Features.Sale.Commands.ShipSaleCommand
                {
                    SaleId = scenario.Sale.Id,
                    Items = new() { new ShipSaleItemDto { SaleItemId = scenario.Item.Id, ExcessQuantity = 2 } },
                }, CancellationToken.None);

            // An open return already reserves 2 of the 5 shipped, and 1 of the 2 excess.
            await new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new CreateSaleReturnCommand
                {
                    SaleId = scenario.Sale.Id,
                    Claims = new()
                    {
                        new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 2, Problem = ReturnProblemEnum.DEFECTIVE },
                        new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.OFF_ORDER, OffScopeKind = ReturnOffScopeKindEnum.EXCESS, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 1, Problem = ReturnProblemEnum.OVER_SHIPPED },
                    },
                }, CancellationToken.None);

            var res = await new GetSaleDetailQueryHandler(scope.Db, FakeObjectStorage.Instance, scope.SaleReturnCalculation)
                .Handle(new GetSaleDetailQuery { Id = scenario.Sale.Id }, CancellationToken.None);
            var sale = Assert.IsType<SaleDto>(res.Data);
            var item = sale.Items.Single();

            Assert.Equal(3, item.ClaimableQuantity);
            Assert.Equal(1, item.ClaimableExcessQuantity);
            Assert.Equal(scenario.Product.Code, item.ProductCode);
            Assert.False(string.IsNullOrEmpty(item.Unit));
            Assert.Equal(1, sale.ReturnCount);
            Assert.True(sale.HasOpenReturn);
        }

        // --- Section 3, item 9 ---

        [Fact]
        public async Task PurchaseReturnPendingEffects_CarryThePurchaseTheReplacementArrivesOn()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, returnId, claimId) = await SeedPurchaseReturn(scope);

            await new PRC.AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PRC.AddClaimResolutionCommand
                {
                    ClaimId = claimId,
                    Composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new() { new GoodsEffectDto { Quantity = 3 } } },
                }, CancellationToken.None);

            var res = await new GetPurchaseReturnPendingEffectsQueryHandler(scope.Db).Handle(new GetPurchaseReturnPendingEffectsQuery(), CancellationToken.None);
            var row = Read<Application.Features.PurchaseReturn.Dtos.PendingEffectDto>(res, "PendingEffects").Single();

            Assert.Equal(returnId, row.PurchaseReturnId);
            Assert.Equal(scenario.Purchase.Id, row.PurchaseId);
            Assert.Equal(scenario.Purchase.InvoiceNumber, row.InvoiceNumber);
            Assert.Equal(scenario.Supplier.CompanyName, row.SupplierName);
        }

        [Fact]
        public async Task SaleReturnPendingEffects_CarryTheSaleTheReplacementShipsOn()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 5);

            await new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new CreateSaleReturnCommand
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
                            Quantity = 2,
                            Problem = ReturnProblemEnum.DEFECTIVE,
                        },
                    },
                }, CancellationToken.None);
            var claimId = scope.Context.SaleReturnClaims.Single().Id;

            await new Application.Features.SaleReturn.Commands.AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new Application.Features.SaleReturn.Commands.AddClaimResolutionCommand
                {
                    ClaimId = claimId,
                    Composition = new EffectCompositionDto { Quantity = 2, GoodsOut = new() { new GoodsEffectDto { Quantity = 2 } } },
                }, CancellationToken.None);

            var res = await new SRQ.GetSaleReturnPendingEffectsQueryHandler(scope.Db).Handle(new SRQ.GetSaleReturnPendingEffectsQuery(), CancellationToken.None);
            var row = Read<Application.Features.SaleReturn.Dtos.PendingEffectDto>(res, "PendingEffects").Single();

            Assert.Equal(scenario.Sale.Id, row.SaleId);
            Assert.Equal(scenario.Sale.InvoiceNumber, row.InvoiceNumber);
            Assert.Equal("علی رضایی", row.CustomerName);
        }

        // --- Section 5 ---

        [Fact]
        public async Task UpdatePurchaseReturnAttachments_ReplacesWholesale_AndDetailReturnsThem()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, _) = await SeedPurchaseReturn(scope);
            var handler = new UpdatePurchaseReturnAttachmentsCommandHandler(scope.Db, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork);

            await handler.Handle(new UpdatePurchaseReturnAttachmentsCommand
            {
                Id = returnId,
                Attachments = new() { new DocumentAttachmentInputDto { ObjectKey = "receipt.pdf" }, new DocumentAttachmentInputDto { ObjectKey = "photo.jpg" } },
            }, CancellationToken.None);
            var res = await handler.Handle(new UpdatePurchaseReturnAttachmentsCommand
            {
                Id = returnId,
                Attachments = new() { new DocumentAttachmentInputDto { ObjectKey = "signed-receipt.pdf", FileName = "رسید.pdf" } },
            }, CancellationToken.None);

            var dto = Assert.IsType<PurchaseReturnDetailDto>(res.Data);
            var attachment = Assert.Single(dto.Attachments);
            Assert.Equal("signed-receipt.pdf", attachment.ObjectKey);
            Assert.NotNull(attachment.Url);

            var detail = await new GetPurchaseReturnDetailQueryHandler(scope.Db, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance)
                .Handle(new GetPurchaseReturnDetailQuery { Id = returnId }, CancellationToken.None);
            Assert.Single(Assert.IsType<PurchaseReturnDetailDto>(detail.Data).Attachments);
        }

        [Fact]
        public async Task UpdateSaleReturnAttachments_UnknownReturn_Throws404()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var handler = new UpdateSaleReturnAttachmentsCommandHandler(scope.Db, scope.SaleReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new UpdateSaleReturnAttachmentsCommand { Id = 999 }, CancellationToken.None));
        }

        [Fact]
        public async Task GetPurchaseReturnPdf_RendersForAReturnWithNoMoneyEffect()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (_, returnId, _) = await SeedPurchaseReturn(scope);

            // The QuestPDF engine: the Excel one needs LibreOffice on the machine running the tests.
            var pdf = new Infrastructure.Services.QuestPdfInvoiceDocumentService(scope.QuestPdfDocumentService);
            var file = await new Application.Features.Invoice.Queries.GetPurchaseReturnPdfQueryHandler(scope.Db, pdf, new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build())
                .Handle(new Application.Features.Invoice.Queries.GetPurchaseReturnPdfQuery { PurchaseReturnId = returnId }, CancellationToken.None);

            Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(file.Content, 0, 4));
        }

        // --- Section 6 ---

        private sealed record Org(Domain.Entities.Department Department, Domain.Entities.Team TeamA, Domain.Entities.Team TeamB,
            Domain.Entities.User DepartmentHead, Domain.Entities.User TeamADeputy, Domain.Entities.User TeamAMember, Domain.Entities.User TeamBMember);

        /// <summary>One department, two teams; each of the four people has one sale of 1,000 x (their index).</summary>
        private static Org SeedOrg(TestScope scope)
        {
            var department = Seed.Department("فروش");
            var teamA = Seed.Team(department, "تیم الف");
            var teamB = Seed.Team(department, "تیم ب");
            var head = Seed.User(department, null, "dhead");
            var deputy = Seed.User(department, teamA, "adeputy");
            var member = Seed.User(department, teamA, "amember");
            var other = Seed.User(department, teamB, "bmember");
            scope.Context.Users.AddRange(head, deputy, member, other);
            scope.Context.SaveChanges();
            department.HeadId = head.Id;
            teamA.DeputyId = deputy.Id;

            var product = Seed.Product(Seed.Category());
            var customer = Seed.Customer();
            var i = 1;
            foreach (var user in new[] { head, deputy, member, other })
            {
                var sale = Seed.Sale(customer, SalesStatusEnum.PROCESSING, Seed.SaleItem(product, i++, 1000));
                sale.SalesUserId = user.Id;
                scope.Context.Sales.Add(sale);
            }
            scope.Context.SaveChanges();
            return new Org(department, teamA, teamB, head, deputy, member, other);
        }

        private static GetScopePerformanceQueryHandler ScopeHandler(TestScope scope, int userId) =>
            new(scope.Db, scope.OrgRoleService, FakeUserContext.WithUserId(userId));

        [Fact]
        public async Task ScopePerformance_Me_CountsOnlyTheCallersOwnDocuments()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var org = SeedOrg(scope);

            var res = await ScopeHandler(scope, org.TeamAMember.Id).Handle(new GetScopePerformanceQuery { Scope = ReportScopeEnum.ME }, CancellationToken.None);
            var dto = Assert.IsType<ScopePerformanceDto>(res.Data);

            Assert.Empty(dto.Members);
            Assert.Equal(1, dto.Periods.Sum(p => p.SalesCount));
            Assert.Equal(3000UL, dto.Periods.Aggregate(0UL, (s, p) => s + p.SaleInvoiceAmount));
        }

        [Theory]
        [InlineData(ReportScopeEnum.TEAM)]
        [InlineData(ReportScopeEnum.DEPARTMENT)]
        public async Task ScopePerformance_PlainMember_IsForbidden(ReportScopeEnum scopeKind)
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var org = SeedOrg(scope);

            await Assert.ThrowsAsync<ForbiddenCustomException>(() =>
                ScopeHandler(scope, org.TeamAMember.Id).Handle(new GetScopePerformanceQuery { Scope = scopeKind }, CancellationToken.None));
        }

        [Fact]
        public async Task ScopePerformance_TeamDeputy_SeesOnlyTheirTeam_AndCannotAskForTheDepartment()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var org = SeedOrg(scope);

            var res = await ScopeHandler(scope, org.TeamADeputy.Id).Handle(new GetScopePerformanceQuery { Scope = ReportScopeEnum.TEAM }, CancellationToken.None);
            var dto = Assert.IsType<ScopePerformanceDto>(res.Data);

            Assert.Equal("تیم الف", dto.ScopeName);
            Assert.Equal(new[] { org.TeamADeputy.Id, org.TeamAMember.Id }.OrderBy(x => x), dto.Members.Select(m => m.UserId).OrderBy(x => x));
            Assert.Equal(OrgRoleEnum.TEAM_DEPUTY, dto.Members.Single(m => m.UserId == org.TeamADeputy.Id).Role);
            Assert.Equal(5000UL, dto.Periods.Aggregate(0UL, (s, p) => s + p.SaleInvoiceAmount));

            await Assert.ThrowsAsync<ForbiddenCustomException>(() =>
                ScopeHandler(scope, org.TeamADeputy.Id).Handle(new GetScopePerformanceQuery { Scope = ReportScopeEnum.DEPARTMENT }, CancellationToken.None));
        }

        [Fact]
        public async Task ScopePerformance_DepartmentHead_SeesEveryTeamPlusTeamless_AndPeriodsEqualMembers()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var org = SeedOrg(scope);

            var res = await ScopeHandler(scope, org.DepartmentHead.Id).Handle(new GetScopePerformanceQuery { Scope = ReportScopeEnum.DEPARTMENT }, CancellationToken.None);
            var dto = Assert.IsType<ScopePerformanceDto>(res.Data);

            Assert.Equal("فروش", dto.ScopeName);
            Assert.Equal(4, dto.Members.Count);
            Assert.Equal(OrgRoleEnum.DEPARTMENT_HEAD, dto.Members.Single(m => m.UserId == org.DepartmentHead.Id).Role);
            var periods = dto.Periods.Aggregate(0UL, (s, p) => s + p.SaleInvoiceAmount);
            var members = dto.Members.Aggregate(0UL, (s, m) => s + m.SaleInvoiceAmount);
            Assert.Equal(10_000UL, periods);
            Assert.Equal(periods, members);
        }
    }
}
