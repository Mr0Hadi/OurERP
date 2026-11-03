using Application.Common.Dtos;
using Application.Common.Ledger;
using Application.Features.Customer.Commands;
using Application.Features.Customer.Queries;
using Application.Features.Customer.Dtos;
using Application.Features.Product.Commands;
using Application.Features.Product.Queries;
using Application.Features.Reorder.Dtos;
using Application.Features.Reorder.Queries;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.SaleInstallment.Commands;
using Application.Features.SaleInstallment.Dtos;
using Application.Features.SaleInstallment.Queries;
using Application.Features.User.Command;
using Application.Features.User.Query;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>docs/frontend-requests.fa.md, the 2026-10-30 backlog pass (sections 6.3, 7, 8, 9, 15, 17, 19, 21, 28, 29).</summary>
    public class FrontendRequestsBacklogTests
    {
        private static CancellationToken Ct => TestContext.Current.CancellationToken;

        // ---- 9.10: official numbers come from a counter, not the row count ----

        [Fact]
        public async Task InvoiceNumbers_AreDistinctAndSequential_EvenWithUnnumberedProformasAround()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);

            var first = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var second = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var a = await ProformaFlow.ReadyForPaymentAsync(mediator, first, await ProformaFlow.ScannableStockAsync(scope, first.Product, 1));
            var b = await ProformaFlow.ReadyForPaymentAsync(mediator, second, await ProformaFlow.ScannableStockAsync(scope, second.Product, 1));

            await mediator.Send(new AddSalePaymentCommand { SaleId = a.Id, Type = PaymentTypeEnum.CASH, Amount = 100 }, Ct);
            await mediator.Send(new AddSalePaymentCommand { SaleId = b.Id, Type = PaymentTypeEnum.CASH, Amount = 100 }, Ct);

            using var verify = db.NewContext();
            var numbers = verify.Sales.Where(s => s.Id == a.Id || s.Id == b.Id).OrderBy(s => s.Id).Select(s => s.InvoiceNumber).ToList();
            Assert.Equal(2, numbers.Distinct().Count());
            var seq = numbers.Select(n => int.Parse(n.Split('-').Last())).ToList();
            Assert.Equal(seq[0] + 1, seq[1]);
        }

        // ---- 9.11: a credit sale issues its invoice with nothing paid ----

        [Fact]
        public async Task ChangeSaleStatus_Processing_IssuesTheInvoiceOfACheckedProformaWithNothingPaid()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 2, shippedQuantity: 0, stock: 0);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, await ProformaFlow.ScannableStockAsync(scope, scenario.Product, 2), paymentType: PaymentTypeEnum.CREDIT);

            var issued = Assert.IsType<SaleDto>((await mediator.Send(new ChangeSaleStatusCommand { Id = sale.Id, Status = SalesStatusEnum.PROCESSING }, Ct)).Data);

            Assert.Equal(SalesStatusEnum.PROCESSING, issued.Status);
            Assert.False(string.IsNullOrEmpty(issued.InvoiceNumber));
            Assert.Equal(0UL, issued.PaidAmount);
            Assert.Equal((decimal)issued.TotalAmount, await PartyLedger.BalanceAsync(scope.Db, scenario.Customer.Id, null, Ct));
        }

        [Fact]
        public async Task ChangeSaleStatus_Processing_IsRefusedBeforeTheWarehouseCheck()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope);
            var scenario = Seed.Proforma(scope.Context, stage: SaleProformaStageEnum.CUSTOMER_APPROVED);

            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                mediator.Send(new ChangeSaleStatusCommand { Id = scenario.Sale.Id, Status = SalesStatusEnum.PROCESSING }, Ct));
        }

        // ---- 29.1: untracked goods are reserved without a scan ----

        [Fact]
        public async Task WarehouseCheck_UntrackedProduct_ReservesTheOldestFreeUnitsWithoutAScan()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope);
            var scenario = Seed.Proforma(scope.Context, orderedQuantity: 5, stock: 20, stage: SaleProformaStageEnum.CUSTOMER_APPROVED);

            var checkedSale = Assert.IsType<SaleDto>((await mediator.Send(new CheckSaleWarehouseCommand
            {
                SaleId = scenario.Sale.Id,
                Revision = scenario.Sale.Revision,
            }, Ct)).Data);

            Assert.Equal(SaleProformaStageEnum.WAREHOUSE_CHECKED, checkedSale.ProformaStage);
            using var verify = db.NewContext();
            var reserved = verify.ProductUnits.Where(u => u.ProductId == scenario.Product.Id && u.Status == ProductUnitStatusEnum.RESERVED)
                .Select(u => u.SerialNumber).OrderBy(s => s).ToList();
            var oldest = verify.ProductUnits.Where(u => u.ProductId == scenario.Product.Id).Select(u => u.SerialNumber).OrderBy(s => s).Take(5).ToList();
            Assert.Equal(oldest, reserved);
            Assert.Equal(15, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task WarehouseCheck_UntrackedProduct_RecordsAShortageWhenTheShelfIsShort()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope);
            var scenario = Seed.Proforma(scope.Context, orderedQuantity: 5, stock: 3, stage: SaleProformaStageEnum.CUSTOMER_APPROVED);

            var result = Assert.IsType<SaleDto>((await mediator.Send(new CheckSaleWarehouseCommand { SaleId = scenario.Sale.Id, Revision = scenario.Sale.Revision }, Ct)).Data);

            Assert.Equal(SaleProformaStageEnum.DRAFT, result.ProformaStage);
            using var verify = db.NewContext();
            Assert.Equal(0, verify.ProductUnits.Count(u => u.ProductId == scenario.Product.Id && u.Status == ProductUnitStatusEnum.RESERVED));
        }

        [Fact]
        public async Task WarehouseCheck_TrackedProduct_StillNeedsEveryUnitScanned()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope);
            var scenario = Seed.Proforma(scope.Context, orderedQuantity: 2, stock: 10, stage: SaleProformaStageEnum.CUSTOMER_APPROVED);
            scenario.Product.RequiresUnitTracking = true;
            await scope.Context.SaveChangesAsync(Ct);

            var result = Assert.IsType<SaleDto>((await mediator.Send(new CheckSaleWarehouseCommand { SaleId = scenario.Sale.Id, Revision = scenario.Sale.Revision }, Ct)).Data);

            Assert.Equal(SaleProformaStageEnum.DRAFT, result.ProformaStage);
        }

        // ---- 28.1: a product ordered up to its target is not suggested again ----

        [Fact]
        public async Task Reorder_ProductCoveredByAnOpenOrder_IsNotSuggestedAgain()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var product = Seed.Product(category, stock: 3);
            product.LowStockThreshold = 10;
            var supplier = Seed.Supplier();
            var draft = Seed.Purchase(supplier, PurchaseStatusEnum.PROFORMA, Seed.PurchaseItem(product, 7));
            scope.Context.Purchases.Add(draft);
            scope.Context.SaveChanges();
            Seed.MintUnits(scope.Context, product, 3);

            var handler = new GetReorderSuggestionListQueryHandler(scope.Db);
            var covered = Assert.IsAssignableFrom<IEnumerable<ReorderSuggestionDto>>((await handler.Handle(new GetReorderSuggestionListQuery(), Ct)).Data);
            Assert.DoesNotContain(covered, s => s.ProductId == product.Id);

            draft.Items.Single().Quantity = 6;
            scope.Context.SaveChanges();
            var shortByOne = Assert.IsAssignableFrom<IEnumerable<ReorderSuggestionDto>>((await handler.Handle(new GetReorderSuggestionListQuery(), Ct)).Data);
            Assert.Equal(1, shortByOne.Single(s => s.ProductId == product.Id).SuggestedQuantity);
        }

        // ---- 15.5 / 15.2: product delete guard, brand list ----

        [Fact]
        public async Task DeleteProduct_IsRefusedWhileItHasStock()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var product = Seed.Product(Seed.Category(), stock: 2);
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();
            Seed.MintUnits(scope.Context, product, 2);

            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                new DeleteProductCommandHandler(scope.ProductRepository, scope.UnitOfWork, scope.Db).Handle(new DeleteProductCommand { Id = product.Id }, Ct));
        }

        [Fact]
        public async Task GetBrandList_CountsActiveProductsPerBrand()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var a = Seed.Product(category); a.Brand = "Bosch";
            var b = Seed.Product(category); b.Brand = "Bosch";
            var c = Seed.Product(category); c.Brand = "Valeo";
            var gone = Seed.Product(category); gone.Brand = "Gone"; gone.IsActive = false;
            scope.Context.Products.AddRange(a, b, c, gone);
            scope.Context.SaveChanges();

            var rows = Assert.IsType<List<BrandListDto>>((await new GetBrandListQueryHandler(scope.Db).Handle(new GetBrandListQuery { Search = "os" }, Ct)).Data);

            Assert.Equal(new[] { ("Bosch", 2) }, rows.Select(r => (r.Brand, r.ProductCount)));
        }

        // ---- 9.12: word-by-word customer search, phone included ----

        [Fact]
        public async Task CustomerSearch_MatchesEveryWordAndThePhone()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var ali = Seed.Customer("علی", "رضایی"); ali.PhoneNumber = "09121112233";
            var other = Seed.Customer("علی", "محمدی"); other.PhoneNumber = "09124445566";
            scope.Context.Customers.AddRange(ali, other);
            scope.Context.SaveChanges();

            async Task<List<int>> Search(string text) =>
                await GetCustomerListQueryHandler.ApplyFilters(scope.Context.Customers, new GetCustomerListQuery { FullName = text }).Select(x => x.Id).ToListAsync(Ct);

            Assert.Equal(new[] { ali.Id }, await Search("علی رضایی"));
            Assert.Equal(new[] { ali.Id }, await Search("1112233"));
        }

        // ---- 21.1: the typed opening balance lives on the ledger ----

        [Fact]
        public async Task OpeningBalance_IsWrittenOnCreate_AndItsChangeOnUpdate()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var created = await new CreateCustomerCommandHandler(scope.CustomerRepository, TestMapper.Instance, FakeObjectStorage.Instance, scope.UnitOfWork, scope.Db)
                .Handle(new CreateCustomerCommand
                {
                    FirstName = "رضا",
                    LastName = "کریمی",
                    PhoneNumber = "09127778899",
                    Address = "تهران",
                    Balance = 500,
                    BalanceType = BalanceTypeEnum.Debtor,
                }, Ct);
            var id = (int)created.Data!.GetType().GetProperty("Id")!.GetValue(created.Data)!;
            Assert.Equal(500m, await PartyLedger.BalanceAsync(scope.Db, id, null, Ct));

            var customer = scope.Context.Customers.Single(x => x.Id == id);
            await new UpdateCustomerCommandHandler(scope.UnitOfWork, scope.CustomerRepository, FakeObjectStorage.Instance, scope.Db)
                .Handle(new UpdateCustomerCommand
                {
                    Id = id,
                    FirstName = customer.FirstName,
                    LastName = customer.LastName,
                    PhoneNumber = customer.PhoneNumber,
                    Address = customer.Address,
                    Balance = 200,
                    BalanceType = BalanceTypeEnum.Creditor,
                }, Ct);

            Assert.Equal(-200m, await PartyLedger.BalanceAsync(scope.Db, id, null, Ct));
            Assert.Equal(2, scope.Context.PartyLedgerEntries.Count(e => e.CustomerId == id && e.EntryType == PartyLedgerEntryTypeEnum.OPENING_BALANCE));
        }

        // ---- 17.2 / 17.5: installment preview and the zero down payment ----

        [Fact]
        public async Task PreviewInstallmentPlan_FromItems_MatchesTheSaleTotalAndSchedule()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope);
            var product = Seed.Product(Seed.Category());
            product.Tax = 10;
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();

            var preview = Assert.IsType<SaleInstallmentPlanDto>((await mediator.Send(new PreviewSaleInstallmentPlanQuery
            {
                Items = new() { new CreateSaleItemDto { ProductId = product.Id, Quantity = 2, UnitPrice = 10_000 } },
                MarkupPercentage = 10,
                DownPaymentAmount = 2_000,
                InstallmentCount = 4,
                FirstDueDate = DateTime.Today.AddMonths(1),
            }, Ct)).Data);

            Assert.Equal(22_000UL, preview.CashAmount);
            Assert.Equal(2_200UL, preview.InstallmentChargeAmount);
            Assert.Equal(4, preview.Installments.Count);
            Assert.Equal(preview.FinancedAmount, preview.Installments.Aggregate(0UL, (sum, i) => sum + i.Amount));
            Assert.Equal(0, scope.Context.SaleInstallmentPlans.Count());
        }

        [Fact]
        public async Task CreateInstallmentPlan_WithNoDownPayment_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope);
            var scenario = Seed.Proforma(scope.Context, stage: SaleProformaStageEnum.WAREHOUSE_CHECKED);

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new CreateSaleInstallmentPlanCommand
            {
                SaleId = scenario.Sale.Id,
                DownPaymentAmount = 0,
                InstallmentCount = 3,
                FirstDueDate = DateTime.Today.AddMonths(1),
                PaymentType = PaymentTypeEnum.CASH,
            }, Ct));
        }

        // ---- 7.4: an empty date is stored as null ----

        [Fact]
        public async Task EmptyPaymentDate_IsStoredAsNull()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.Proforma(scope.Context);

            scenario.Sale.PaymentDate = DateTime.MinValue;
            await scope.Context.SaveChangesAsync(Ct);

            using var verify = db.NewContext();
            Assert.Null(verify.Sales.Single(s => s.Id == scenario.Sale.Id).PaymentDate);
        }

        // ---- 6.3: dashboard layout per user ----

        [Fact]
        public async Task DashboardLayout_IsSavedAndReadBackForTheSignedInUser()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = Seed.PersistedUser(scope.Context);
            var mediator = ProformaFlow.Mediator(scope, user.Id);
            const string layout = "{\"order\":[\"workQueues\"],\"hidden\":[]}";

            await mediator.Send(new SaveMyDashboardLayoutCommand { Layout = layout }, Ct);
            var read = await mediator.Send(new GetMyDashboardLayoutQuery(), Ct);

            Assert.Equal(layout, read.Data!.GetType().GetProperty("Layout")!.GetValue(read.Data));
            Assert.Equal(0, scope.Context.AuditEntityChanges.Count(c => c.EntityType == nameof(User)));
        }

        // ---- 19: shelf codes compare by segment ----

        [Fact]
        public async Task UnitList_ShelfFilter_MatchesWholeSegmentsAndPaddedNumbers()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var product = Seed.Product(Seed.Category(), stock: 3);
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();
            Seed.MintUnits(scope.Context, product, 3);
            var units = scope.Context.ProductUnits.Where(u => u.ProductId == product.Id).OrderBy(u => u.Id).ToList();
            units[0].BinLocation = "A-5";
            units[1].BinLocation = "A-5-2";
            units[2].BinLocation = "A-50";
            scope.Context.SaveChanges();

            var handler = new GetProductUnitListQueryHandler(scope.Db, scope.ProductCodeService);
            var res = await handler.Handle(new GetProductUnitListQuery { ProductId = product.Id, BinLocation = "a-05" }, Ct);
            var ids = ((IEnumerable<Application.Features.Product.Dtos.ProductUnitDto>)res.Data!.GetType().GetProperty("ProductUnitList")!.GetValue(res.Data)!)
                .Select(u => u.Id).OrderBy(x => x).ToList();

            Assert.Equal(new[] { units[0].Id, units[1].Id }, ids);
        }
    }
}
