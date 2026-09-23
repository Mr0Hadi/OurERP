using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Customer.Dtos;
using Application.Features.Customer.Queries;
using Application.Features.Department.Queries;
using Application.Features.PosTerminal.Queries;
using Application.Features.Product.Dtos;
using Application.Features.Product.Queries;
using Application.Features.ProductCategory.Dtos;
using Application.Features.ProductCategory.Queries;
using Application.Features.Purchase.Queries;
using Application.Features.PurchaseReturn.Queries;
using Application.Features.Report.Queries;
using Application.Features.Sale.Dtos;
using Application.Features.Sale.Queries;
using Application.Features.SaleInstallment.Queries;
using Application.Features.SaleReturn.Queries;
using Application.Features.Supplier.Queries;
using Application.Features.Team.Queries;
using Application.Features.User.Query;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class ListSortingTests
    {
        /// <summary>
        /// Every SortBy value of every paged list query, in both directions, has to translate to SQL.
        /// A sort key EF cannot translate compiles fine and only fails when the query runs, so this
        /// runs them all against a real database.
        /// </summary>
        [Fact]
        public async Task EverySortOption_OfEveryListQuery_Executes()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            Seed.ShippedSale(scope.Context);
            Seed.PendingPurchase(scope.Context);
            Seed.PersistedUser(scope.Context);
            var ct = CancellationToken.None;
            var storage = FakeObjectStorage.Instance;

            await RunAll<CustomerListSortEnum>((s, d) => new GetCustomerListQueryHandler(scope.Db, storage).Handle(new GetCustomerListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<SupplierListSortEnum>((s, d) => new GetSupplierListQueryHandler(scope.Db, storage).Handle(new GetSupplierListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<ProductListSortEnum>((s, d) => new GetProductListQueryHandler(scope.Db, storage).Handle(new GetProductListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<ProductUnitListSortEnum>((s, d) => new GetProductUnitListQueryHandler(scope.Db).Handle(new GetProductUnitListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<ProductCategoryListSortEnum>((s, d) => new GetProductCategoryListQueryHandler(scope.Db).Handle(new GetProductCategoryListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<PurchaseListSortEnum>((s, d) => new GetPurchaseListQueryHandler(scope.Db).Handle(new GetPurchaseListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<SaleListSortEnum>((s, d) => new GetSaleListQueryHandler(scope.Db).Handle(new GetSaleListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<PurchaseReturnListSortEnum>((s, d) => new GetPurchaseReturnListQueryHandler(scope.Db).Handle(new GetPurchaseReturnListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<SaleReturnListSortEnum>((s, d) => new GetSaleReturnListQueryHandler(scope.Db).Handle(new GetSaleReturnListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<SaleInstallmentListSortEnum>((s, d) => new GetSaleInstallmentListQueryHandler(scope.Db).Handle(new GetSaleInstallmentListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<SaleInstallmentPlanListSortEnum>((s, d) => new GetSaleInstallmentPlanListQueryHandler(scope.Db).Handle(new GetSaleInstallmentPlanListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<UserListSortEnum>((s, d) => new GetUserListQueryHandler(scope.Db).Handle(new GetUserListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<DepartmentListSortEnum>((s, d) => new GetDepartmentListQueryHandler(scope.Db).Handle(new GetDepartmentListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<TeamListSortEnum>((s, d) => new GetTeamListQueryHandler(scope.Db).Handle(new GetTeamListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<PosTerminalListSortEnum>((s, d) => new GetPosTerminalListQueryHandler(scope.Db).Handle(new GetPosTerminalListQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<CustomerPurchaseStatisticsSortEnum>((s, d) => new GetCustomerPurchaseStatisticsQueryHandler(scope.Db).Handle(new GetCustomerPurchaseStatisticsQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<SupplierSalesStatisticsSortEnum>((s, d) => new GetSupplierSalesStatisticsQueryHandler(scope.Db).Handle(new GetSupplierSalesStatisticsQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<SalesPerformanceByEmployeeSortEnum>((s, d) => new GetSalesPerformanceByEmployeeQueryHandler(scope.Db).Handle(new GetSalesPerformanceByEmployeeQuery { SortBy = s, SortDirection = d }, ct));
            await RunAll<SupplyPerformanceByEmployeeSortEnum>((s, d) => new GetSupplyPerformanceByEmployeeQueryHandler(scope.Db).Handle(new GetSupplyPerformanceByEmployeeQuery { SortBy = s, SortDirection = d }, ct));
        }

        [Fact]
        public async Task ProductList_SortsByRetailPrice_AndDefaultsToNewestFirst()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var cheap = Seed.Product(category, "ارزان", retailPrice: 100);
            var pricey = Seed.Product(category, "گران", retailPrice: 900);
            var mid = Seed.Product(category, "متوسط", retailPrice: 500);
            scope.Context.Products.AddRange(cheap, pricey, mid);
            scope.Context.SaveChanges();
            var handler = new GetProductListQueryHandler(scope.Db, FakeObjectStorage.Instance);

            var asc = await handler.Handle(new GetProductListQuery { SortBy = ProductListSortEnum.RETAIL_PRICE }, CancellationToken.None);
            Assert.Equal(new[] { "ارزان", "متوسط", "گران" }, ItemsOf<ProductListDto>(asc, "ProductList").Select(x => x.Name));

            var desc = await handler.Handle(new GetProductListQuery { SortBy = ProductListSortEnum.RETAIL_PRICE, SortDirection = SortDirectionEnum.DESC }, CancellationToken.None);
            Assert.Equal(new[] { "گران", "متوسط", "ارزان" }, ItemsOf<ProductListDto>(desc, "ProductList").Select(x => x.Name));

            var byDefault = await handler.Handle(new GetProductListQuery(), CancellationToken.None);
            Assert.Equal(new[] { mid.Id, pricey.Id, cheap.Id }, ItemsOf<ProductListDto>(byDefault, "ProductList").Select(x => x.Id));
        }

        [Fact]
        public async Task ProductList_SortsByComputedQuarantinedCount()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var none = Seed.Product(category, "بدون قرنطینه");
            var many = Seed.Product(category, "قرنطینه زیاد");
            var few = Seed.Product(category, "قرنطینه کم");
            scope.Context.Products.AddRange(none, many, few);
            scope.Context.SaveChanges();
            Seed.MintUnits(scope.Context, many, 3, ProductUnitStatusEnum.QUARANTINED);
            Seed.MintUnits(scope.Context, few, 1, ProductUnitStatusEnum.QUARANTINED);

            var res = await new GetProductListQueryHandler(scope.Db, FakeObjectStorage.Instance).Handle(
                new GetProductListQuery { SortBy = ProductListSortEnum.QUARANTINED_COUNT, SortDirection = SortDirectionEnum.DESC }, CancellationToken.None);

            Assert.Equal(new[] { 3, 1, 0 }, ItemsOf<ProductListDto>(res, "ProductList").Select(x => x.QuarantinedCount));
        }

        [Fact]
        public async Task ProductCategoryList_SortsByProductCount_AndDefaultsToAlphabetical()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var empty = Seed.Category("ب-خالی");
            var full = Seed.Category("ج-پر");
            var one = Seed.Category("الف-یکی");
            scope.Context.ProductCategories.AddRange(empty, full, one);
            scope.Context.Products.AddRange(Seed.Product(full), Seed.Product(full), Seed.Product(one));
            scope.Context.SaveChanges();
            var handler = new GetProductCategoryListQueryHandler(scope.Db);

            var byCount = await handler.Handle(new GetProductCategoryListQuery { SortBy = ProductCategoryListSortEnum.PRODUCT_COUNT, SortDirection = SortDirectionEnum.DESC }, CancellationToken.None);
            Assert.Equal(new[] { 2, 1, 0 }, ItemsOf<ProductCategoryListDto>(byCount, "ProductCategoryList").Select(x => x.ProductCount));

            var byDefault = await handler.Handle(new GetProductCategoryListQuery(), CancellationToken.None);
            Assert.Equal(new[] { "الف-یکی", "ب-خالی", "ج-پر" }, ItemsOf<ProductCategoryListDto>(byDefault, "ProductCategoryList").Select(x => x.Name));
        }

        [Fact]
        public async Task CustomerList_BreaksTiesById_SoPagesNeverOverlap()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var customers = Enumerable.Range(0, 5).Select(i => Seed.Customer("مشتری" + i, "یکسان")).ToList();
            scope.Context.Customers.AddRange(customers);
            scope.Context.SaveChanges();
            var handler = new GetCustomerListQueryHandler(scope.Db, FakeObjectStorage.Instance);

            var seen = new List<int>();
            for (var page = 1; page <= 3; page++)
            {
                var res = await handler.Handle(new GetCustomerListQuery { SortBy = CustomerListSortEnum.LAST_NAME, Page = page, Take = 2 }, CancellationToken.None);
                seen.AddRange(ItemsOf<CustomerListDto>(res, "CustomerList").Select(x => x.Id));
            }

            Assert.Equal(customers.Select(x => x.Id).OrderBy(x => x), seen);
        }

        [Fact]
        public async Task SaleList_SortsByCustomerName_AndTotalAmount()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var product = Seed.Product(category);
            var zahra = Seed.Customer("زهرا", "احمدی");
            var babak = Seed.Customer("بابک", "نوری");
            scope.Context.Sales.AddRange(
                Seed.Sale(zahra, SalesStatusEnum.PROCESSING, Seed.SaleItem(product, 1, 1000)),
                Seed.Sale(babak, SalesStatusEnum.PROCESSING, Seed.SaleItem(product, 5, 1000)));
            scope.Context.SaveChanges();
            var handler = new GetSaleListQueryHandler(scope.Db);

            var byName = await handler.Handle(new GetSaleListQuery { SortBy = SaleListSortEnum.CUSTOMER_NAME }, CancellationToken.None);
            Assert.Equal(new[] { "بابک نوری", "زهرا احمدی" }, ItemsOf<SaleListDto>(byName, "SaleList").Select(x => x.CustomerName));

            var byTotal = await handler.Handle(new GetSaleListQuery { SortBy = SaleListSortEnum.TOTAL_AMOUNT, SortDirection = SortDirectionEnum.DESC }, CancellationToken.None);
            Assert.Equal(new[] { 5000UL, 1000UL }, ItemsOf<SaleListDto>(byTotal, "SaleList").Select(x => x.TotalAmount));
        }

        private static async Task RunAll<TSort>(Func<TSort?, SortDirectionEnum?, Task<ResponseDto>> run) where TSort : struct, Enum
        {
            await run(null, null);
            foreach (var sortBy in Enum.GetValues<TSort>())
                foreach (var direction in Enum.GetValues<SortDirectionEnum>())
                    await run(sortBy, direction);
        }

        private static List<T> ItemsOf<T>(ResponseDto res, string propertyName) =>
            (List<T>)res.Data!.GetType().GetProperty(propertyName)!.GetValue(res.Data)!;
    }
}
