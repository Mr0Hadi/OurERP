using Application.Common.Contracts.Barcode;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Documents;
using Application.Common.Contracts.Invoice;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace WMS.Tests.Support
{
    /// <summary>
    /// A real relational database for handler tests: SQLite in-memory, schema built from the
    /// actual <see cref="WMSDbContext"/> model. Relational (unlike the EF in-memory provider), so
    /// FK constraints, cascade deletes and LINQ translation failures all surface here rather than
    /// only in production against SQL Server.
    ///
    /// The connection is held open for the lifetime of the instance - closing it drops the DB.
    /// </summary>
    public sealed class TestDatabase : IDisposable
    {
        // QuestPDF.Settings is process-global and xUnit gives no ordering guarantee across test
        // classes, so setting it only in PdfAndBarcodeSmokeTests' static ctor isn't enough for
        // other test classes (InvoicePdfTests) that use TestScope.PdfDocumentService first.
        static TestDatabase()
        {
            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
        }

        private readonly SqliteConnection _connection;
        private readonly DbContextOptions<WMSDbContext> _options;

        public TestDatabase()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            _options = new DbContextOptionsBuilder<WMSDbContext>()
                .UseSqlite(_connection)
                .EnableSensitiveDataLogging()
                .Options;

            using var context = new WMSDbContext(_options);
            context.Database.EnsureCreated();
        }

        /// <summary>
        /// A brand-new context over the same database. Use for assertions so reads come off the
        /// database rather than the change tracker of the context the handler just wrote through.
        /// </summary>
        public WMSDbContext NewContext() => new(_options);

        /// <summary>
        /// One scope's worth of the real infrastructure wiring: a context, the real repositories,
        /// the real UnitOfWork and the real calculation services, all sharing a single context -
        /// which is exactly how they are registered (Scoped) in production.
        /// </summary>
        public TestScope NewScope() => new(NewContext());

        public void Dispose()
        {
            _connection.Dispose();
        }
    }

    public sealed class TestScope : IDisposable
    {
        public TestScope(WMSDbContext context)
        {
            Context = context;
            // Fully qualified: the `using Application.Common.Contracts.UnitOfWork` above makes the
            // bare name `UnitOfWork` resolve to that namespace rather than the type.
            UnitOfWork = new Infrastructure.UnitOfWork.UnitOfWork(context);
            SaleReturnQueryService = new SaleReturnQueryService();
            SaleReturnRepository = new SaleReturnRepository(context, SaleReturnQueryService);
            PurchaseReturnQueryService = new PurchaseReturnQueryService();
            PurchaseReturnRepository = new PurchaseReturnRepository(context, PurchaseReturnQueryService);
            PurchaseRepository = new PurchaseRepository(context);
            ProductRepository = new ProductRepository(context);
            CustomerRepository = new CustomerRepository(context);
            SupplierRepository = new SupplierRepository(context);
            UserRepository = new UserRepository(context);
            ProductCategoryRepository = new ProductCategoryRepository(context);
            DepartmentRepository = new DepartmentRepository(context);
            TeamRepository = new TeamRepository(context);
            SaleReturnCalculation = new SaleReturnCalculationService();
            PurchaseReturnCalculation = new PurchaseReturnCalculationService();
            ProductCodeService = new ProductCodeService();
            ProductUnitService = new ProductUnitService(context, ProductCodeService);
            BarcodeRenderer = new ZXingBarcodeRenderer();
            QuestPdfDocumentService = new QuestPdfDocumentService(BarcodeRenderer);
            // Invoice rendering shells out to LibreOffice - not exercised by tests that don't call
            // RenderInvoiceAsync (soffice is not guaranteed to be installed on the test runner).
            PdfDocumentService = new ExcelInvoiceDocumentService(QuestPdfDocumentService, Options.Create(new LibreOfficeOptions()));
            InvoiceLineCalculation = new InvoiceLineCalculationService();
        }

        public WMSDbContext Context { get; }
        public IWMSDbContext Db => Context;
        public IUnitOfWork UnitOfWork { get; }
        public ISaleReturnRepository SaleReturnRepository { get; }
        public IPurchaseReturnRepository PurchaseReturnRepository { get; }
        public IPurchaseRepository PurchaseRepository { get; }
        public IProductRepository ProductRepository { get; }
        public ICustomerRepository CustomerRepository { get; }
        public ISupplierRepository SupplierRepository { get; }
        public IUserRepository UserRepository { get; }
        public IProductCategoryRepository ProductCategoryRepository { get; }
        public IDepartmentRepository DepartmentRepository { get; }
        public ITeamRepository TeamRepository { get; }
        public ISaleReturnCalculationService SaleReturnCalculation { get; }
        public ISaleReturnQueryService SaleReturnQueryService { get; }
        public IInvoiceLineCalculationService InvoiceLineCalculation { get; }
        public IPurchaseReturnCalculationService PurchaseReturnCalculation { get; }
        public IPurchaseReturnQueryService PurchaseReturnQueryService { get; }
        public IProductCodeService ProductCodeService { get; }
        public IProductUnitService ProductUnitService { get; }
        public IBarcodeRenderer BarcodeRenderer { get; }
        public QuestPdfDocumentService QuestPdfDocumentService { get; }
        public IPdfDocumentService PdfDocumentService { get; }

        public void Dispose()
        {
            Context.Dispose();
        }
    }
}
