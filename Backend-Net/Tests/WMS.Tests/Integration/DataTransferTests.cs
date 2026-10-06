using System.Text;
using Application.Common.Contracts.DataTransfer;
using Application.Common.DataTransfer;
using Application.Features.Customer.Commands;
using Application.Features.Customer.DataTransfer;
using Application.Features.Customer.Queries;
using Application.Features.Product.DataTransfer;
using Application.Features.Product.Queries;
using Application.Features.Supplier.Commands;
using Application.Features.Supplier.DataTransfer;
using Common.Exceptions;
using FluentValidation;
using Infrastructure.Services.DataTransfer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// The real definitions against SQL Server: exports filtered through the list queries' own filter code, imports
    /// created through the create handlers' own code, and a failing batch rolling the whole file back.
    /// </summary>
    public class DataTransferTests
    {
        private static readonly IServiceProvider Validators = new ServiceCollection()
            .AddValidatorsFromAssemblyContaining<CreateCustomerCommandValidator>()
            .BuildServiceProvider();

        private static ImportRunner Runner(TestScope scope, int batchSize = 200)
            => new(Validators, scope.UnitOfWork, Options.Create(new DataTransferOptions { ImportBatchSize = batchSize }));

        private static ProductDataTransferDefinition Products(TestScope scope)
            => new(scope.Db, TestMapper.Instance, FakeObjectStorage.Instance, scope.ProductCodeService, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);

        private static CustomerDataTransferDefinition Customers(TestScope scope)
            => new(scope.Db, TestMapper.Instance, FakeObjectStorage.Instance, scope.UnitOfWork);

        private static SupplierDataTransferDefinition Suppliers(TestScope scope)
            => new(scope.Db, TestMapper.Instance, FakeObjectStorage.Instance, scope.UnitOfWork);

        private static async Task<string> ExportCsvAsync(IExportSpec export, object filter)
        {
            using var output = new MemoryStream();
            var writer = new CsvTabularFormat().CreateWriter(output, export.Columns, "x");
            await foreach (var row in export.ReadRowsAsync(filter, CancellationToken.None))
                await writer.WriteRowAsync(row, CancellationToken.None);
            await writer.CompleteAsync(CancellationToken.None);
            return Encoding.UTF8.GetString(output.ToArray()[3..]);
        }

        private static TabularSheet Csv(string text)
            => new CsvTabularFormat().ReadAsync(new MemoryStream(Encoding.UTF8.GetBytes(text)), new TabularReadLimits { MaxRows = 1000, MaxUncompressedBytes = 1 }, CancellationToken.None).Result;

        private static ImportRequest Request(string resource, TabularSheet sheet, ImportModeEnum mode = ImportModeEnum.COMMIT)
            => new() { Resource = resource, Sheet = sheet, Mode = mode };

        [Fact]
        public async Task ProductExport_UsesTheListFilters_AndOnlyWhitelistedFields()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var engine = Seed.Category("لوازم موتوری");
            var brake = Seed.Category("ترمز");
            scope.Context.ProductCategories.AddRange(engine, brake);
            scope.Context.Products.AddRange(Seed.Product(engine, "پیستون"), Seed.Product(brake, "لنت بوش"), Seed.Product(brake, "لنت ایرانی"));
            scope.Context.SaveChanges();

            var export = Products(scope).Export;
            var filter = new GetProductListQuery { ProductCategoryId = brake.Id, Name = "لنت" };

            Assert.Equal(2, await export.CountAsync(filter, CancellationToken.None));
            var csv = await ExportCsvAsync(export, filter);

            Assert.StartsWith("کد کالا,نام کالا,", csv);
            Assert.Contains("لنت بوش", csv);
            Assert.Contains("لنت ایرانی", csv);
            Assert.DoesNotContain("پیستون", csv);
        }

        [Fact]
        public async Task ProductExport_LeavesOutDeletedProducts()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var deleted = Seed.Product(category, "حذف شده");
            deleted.IsActive = false;
            scope.Context.ProductCategories.Add(category);
            scope.Context.Products.AddRange(Seed.Product(category, "فعال"), deleted);
            scope.Context.SaveChanges();

            var csv = await ExportCsvAsync(Products(scope).Export, new GetProductListQuery());

            Assert.Contains("فعال", csv);
            Assert.DoesNotContain("حذف شده", csv);
        }

        [Fact]
        public async Task CustomerExport_FiltersByName_AndEmptyResultIsHeaderOnly()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            scope.Context.Customers.AddRange(Seed.Customer("علی", "رضایی"), Seed.Customer("سارا", "محمدی"));
            scope.Context.SaveChanges();

            var export = Customers(scope).Export;

            var csv = await ExportCsvAsync(export, new GetCustomerListQuery { FullName = "سارا" });
            Assert.Contains("محمدی", csv);
            Assert.DoesNotContain("رضایی", csv);

            var empty = await ExportCsvAsync(export, new GetCustomerListQuery { FullName = "هیچ‌کس" });
            Assert.Single(empty.Split("\r\n", StringSplitOptions.RemoveEmptyEntries));
        }

        [Fact]
        public async Task ProductImport_ResolvesCategoryByName_AndGeneratesCodes()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category("لوازم یدکی");
            scope.Context.ProductCategories.Add(category);
            scope.Context.SaveChanges();

            var sheet = Csv("نام کالا,برند,دسته‌بندی,واحد,قیمت خرید,قیمت فروش,قیمت عمده\n" +
                            "فیلتر روغن,بوش,لوازم يدكي,عدد,100,150,140\n" +
                            "شمع,NGK,لوازم یدکی,Box,200,250,240\n");

            var result = await Products(scope).Import.RunAsync(Runner(scope), Request("products", sheet), CancellationToken.None);

            Assert.True(result.Committed);
            Assert.Equal(2, result.ImportedRows);
            using var verify = db.NewContext();
            var products = await verify.Products.OrderBy(p => p.Id).ToListAsync();
            Assert.Equal(new[] { "فیلتر روغن", "شمع" }, products.Select(p => p.Name));
            Assert.All(products, p => Assert.Equal(category.Id, p.ProductCategoryId));
            Assert.All(products, p => Assert.True(p.IsActive));
            Assert.All(products, p => Assert.Contains("-", p.Code));   // a real code, not the Guid placeholder
            Assert.All(products, p => Assert.Equal(0, p.Stock));
        }

        [Fact]
        public async Task ProductImport_UnknownCategory_IsAnError_AndNothingIsCreated()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var sheet = Csv("نام کالا,برند,دسته‌بندی,واحد,قیمت خرید,قیمت فروش,قیمت عمده\nفیلتر,بوش,ناموجود,عدد,100,150,140\n");

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() =>
                Products(scope).Import.RunAsync(Runner(scope), Request("products", sheet), CancellationToken.None));

            var result = Assert.IsType<ImportResultDto>(ex.Data);
            Assert.Contains(result.Issues, i => i.ErrorCode == ImportErrorCodes.ReferenceNotFound && i.Value == "ناموجود");
            using var verify = db.NewContext();
            Assert.Empty(verify.Products);
            Assert.Empty(verify.ProductCategories);
        }

        [Fact]
        public async Task ProductImport_ExistingNameAndBrand_IsSkippedAsDuplicate()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category("لوازم یدکی");
            var existing = Seed.Product(category, "فیلتر روغن");
            existing.Brand = "بوش";
            scope.Context.ProductCategories.Add(category);
            scope.Context.Products.Add(existing);
            scope.Context.SaveChanges();

            var sheet = Csv("نام کالا,برند,دسته‌بندی,واحد,قیمت خرید,قیمت فروش,قیمت عمده\n" +
                            "فیلتر روغن,بوش,لوازم یدکی,عدد,100,150,140\n" +
                            "فیلتر هوا,بوش,لوازم یدکی,عدد,100,150,140\n");

            var result = await Products(scope).Import.RunAsync(Runner(scope), Request("products", sheet), CancellationToken.None);

            Assert.Equal(1, result.ImportedRows);
            Assert.Equal(1, result.DuplicateRows);
            using var verify = db.NewContext();
            Assert.Equal(2, await verify.Products.CountAsync());
        }

        [Fact]
        public async Task CustomerImport_AppliesTheCreateValidator_AndPersistsValidRows()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            scope.Context.Customers.Add(Seed.Customer());
            scope.Context.SaveChanges();
            var existingPhone = (await scope.Context.Customers.FirstAsync()).PhoneNumber;

            var sheet = Csv("نام,نام خانوادگی,شماره تماس,آدرس,نوع مانده\n" +
                            "مریم,احمدی,۰۹۱۲۳۴۵۶۷۸۹,تهران,بدهکار\n" +
                            "John,Smith,09120000001,Tehran,\n" +           // not Persian
                            $"رضا,کریمی,{existingPhone},شیراز,\n");         // phone already on file

            var preview = await Customers(scope).Import.RunAsync(Runner(scope), Request("customers", sheet, ImportModeEnum.PREVIEW), CancellationToken.None);
            Assert.Equal(1, preview.ValidRows);
            Assert.Equal(1, preview.InvalidRows);
            Assert.Equal(1, preview.DuplicateRows);
            Assert.Contains(preview.Issues, i => i.RowNumber == 3 && i.Column == "نام" && i.ErrorCode == ImportErrorCodes.Validation);

            var result = await Customers(scope).Import.RunAsync(Runner(scope),
                new ImportRequest { Resource = "customers", Sheet = sheet, Mode = ImportModeEnum.COMMIT, SkipInvalidRows = true }, CancellationToken.None);

            Assert.Equal(1, result.ImportedRows);
            using var verify = db.NewContext();
            var imported = await verify.Customers.SingleAsync(c => c.FirstName == "مریم");
            Assert.Equal("09123456789", imported.PhoneNumber);
            Assert.Equal(Domain.Enums.BalanceTypeEnum.Debtor, imported.BalanceType);
            Assert.True(imported.IsActive);
            Assert.Equal(string.Empty, imported.PostalCode);
        }

        [Fact]
        public async Task SupplierImport_AFailingBatch_RollsBackTheBatchesAlreadySaved()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var definition = Suppliers(scope);
            var original = (ImportSpec<CreateSupplierCommand>)definition.Import;
            var batches = 0;
            var failing = new ImportSpec<CreateSupplierCommand>
            {
                Permission = original.Permission,
                Columns = original.Columns,
                DuplicateKeys = original.DuplicateKeys,
                Map = original.Map,
                CommitBatchAsync = async (batch, ct) =>
                {
                    await original.CommitBatchAsync(batch, ct);       // really saved, inside the transaction
                    if (++batches == 2) throw new InvalidOperationException("simulated failure");
                },
            };

            var sheet = Csv("نام شرکت,شماره تماس,آدرس\n" +
                            "شرکت الف,09121111111,تهران\n" +
                            "شرکت ب,09121111112,تهران\n" +
                            "شرکت ج,09121111113,تهران\n");

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                failing.RunAsync(Runner(scope, batchSize: 1), Request("suppliers", sheet), CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Empty(verify.Suppliers);
        }
    }
}
