using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.DataTransfer;
using Application.Features.Product.Commands;
using Application.Features.Product.Queries;
using AutoMapper;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.DataTransfer
{
    /// <summary>
    /// Products in and out of CSV/XLSX. Export: the product list's own filters, whitelisted catalog fields only.
    /// Import: rows become CreateProductCommand, checked by its validator and created through CreateProductCommandHandler's
    /// own two steps, so code/barcode generation works exactly as it does for a product typed into the form.
    ///
    /// Not importable on purpose: Stock (opening stock mints units and writes the cost ledger - an inventory event,
    /// not catalog data; it comes in through receiving), Code/BarCode (server-generated), the image.
    /// </summary>
    public class ProductDataTransferDefinition : IDataTransferDefinition
    {
        private readonly IWMSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IProductCodeService _productCodeService;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUnitOfWork _unitOfWork;

        public ProductDataTransferDefinition(IWMSDbContext context, IMapper mapper, IObjectStorageService objectStorageService,
            IProductCodeService productCodeService, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService,
            IUnitOfWork unitOfWork)
        {
            _context = context;
            _mapper = mapper;
            _objectStorageService = objectStorageService;
            _productCodeService = productCodeService;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _unitOfWork = unitOfWork;
        }

        public string Resource => "products";

        public string Title => "کالاها";

        public IExportSpec Export => new ExportSpec<GetProductListQuery, ProductExportRow>
        {
            Permission = PermissionEnum.ProductExport,
            Query = async (filter, ct) =>
                (await GetProductListQueryHandler.ApplyFiltersAsync(_context.Products.Where(x => x.IsActive).AsNoTracking(), filter, ct))
                .OrderBy(x => x.Id)
                .Select(x => new ProductExportRow
                {
                    Code = x.Code,
                    Name = x.Name,
                    EnglishName = x.EnglishName,
                    Brand = x.Brand,
                    Category = x.ProductCategory.Name,
                    Unit = x.Unit,
                    BarCode = x.BarCode,
                    SupplierBarCode = x.SupplierBarCode,
                    PurchasePrice = x.PurchasePrice,
                    RetailPrice = x.RetailPrice,
                    WholeSalePrice = x.WholeSalePrice,
                    Tax = x.Tax,
                    TaxCategory = x.TaxCategory,
                    Stock = x.Stock,
                    LowStockThreshold = x.LowStockThreshold,
                    RequiresUnitTracking = x.RequiresUnitTracking,
                }),
            Fields = new List<ExportColumn<ProductExportRow>>
            {
                new() { Key = "code", Header = "کد کالا", Value = r => r.Code },
                new() { Key = "name", Header = "نام کالا", Value = r => r.Name },
                new() { Key = "englishName", Header = "نام انگلیسی", Value = r => r.EnglishName },
                new() { Key = "brand", Header = "برند", Value = r => r.Brand },
                new() { Key = "category", Header = "دسته‌بندی", Value = r => r.Category },
                new() { Key = "unit", Header = "واحد", Type = DataFieldTypeEnum.Enum, Value = r => r.Unit },
                new() { Key = "barCode", Header = "بارکد", Value = r => r.BarCode },
                new() { Key = "supplierBarCode", Header = "بارکد تامین‌کننده", Value = r => r.SupplierBarCode },
                new() { Key = "purchasePrice", Header = "قیمت خرید", Type = DataFieldTypeEnum.Integer, Value = r => r.PurchasePrice },
                new() { Key = "retailPrice", Header = "قیمت فروش", Type = DataFieldTypeEnum.Integer, Value = r => r.RetailPrice },
                new() { Key = "wholeSalePrice", Header = "قیمت عمده", Type = DataFieldTypeEnum.Integer, Value = r => r.WholeSalePrice },
                new() { Key = "tax", Header = "درصد مالیات", Type = DataFieldTypeEnum.Integer, Value = r => r.Tax },
                new() { Key = "taxCategory", Header = "وضعیت مالیاتی", Type = DataFieldTypeEnum.Enum, Value = r => r.TaxCategory },
                new() { Key = "stock", Header = "موجودی", Type = DataFieldTypeEnum.Integer, Value = r => r.Stock },
                new() { Key = "lowStockThreshold", Header = "حداقل موجودی", Type = DataFieldTypeEnum.Integer, Value = r => r.LowStockThreshold },
                new() { Key = "requiresUnitTracking", Header = "ردیابی دانه‌ای", Type = DataFieldTypeEnum.Boolean, Value = r => r.RequiresUnitTracking },
            },
        };

        public IImportSpec Import => new ImportSpec<CreateProductCommand>
        {
            Permission = PermissionEnum.ProductImport,
            Columns = new List<ImportColumn>
            {
                new() { Key = "name", Header = "نام کالا", Required = true, Property = nameof(CreateProductCommand.Name), MaxLength = 200, Aliases = new[] { "Name" } },
                new() { Key = "englishName", Header = "نام انگلیسی", Property = nameof(CreateProductCommand.EnglishName), MaxLength = 200, Aliases = new[] { "English Name" } },
                new() { Key = "brand", Header = "برند", Required = true, Property = nameof(CreateProductCommand.Brand), MaxLength = 100, Aliases = new[] { "Brand" } },
                new() { Key = "category", Header = "دسته‌بندی", Required = true, Property = nameof(CreateProductCommand.ProductCategoryId), Aliases = new[] { "Category", "دسته بندی" },
                    Hint = "نام یکی از دسته‌بندی‌های موجود. دسته‌بندی تازه ساخته نمی‌شود." },
                new() { Key = "unit", Header = "واحد", Required = true, Type = DataFieldTypeEnum.Enum, EnumType = typeof(ProductUnitEnum), Property = nameof(CreateProductCommand.Unit), Aliases = new[] { "Unit" } },
                new() { Key = "purchasePrice", Header = "قیمت خرید", Required = true, Type = DataFieldTypeEnum.Integer, MinValue = 0, MaxValue = int.MaxValue, Property = nameof(CreateProductCommand.PurchasePrice), Aliases = new[] { "Purchase Price" } },
                new() { Key = "retailPrice", Header = "قیمت فروش", Required = true, Type = DataFieldTypeEnum.Integer, MinValue = 0, MaxValue = int.MaxValue, Property = nameof(CreateProductCommand.RetailPrice), Aliases = new[] { "Retail Price" } },
                new() { Key = "wholeSalePrice", Header = "قیمت عمده", Required = true, Type = DataFieldTypeEnum.Integer, MinValue = 0, MaxValue = int.MaxValue, Property = nameof(CreateProductCommand.WholeSalePrice), Aliases = new[] { "Wholesale Price" } },
                new() { Key = "tax", Header = "درصد مالیات", Type = DataFieldTypeEnum.Integer, MinValue = 0, MaxValue = 100, Property = nameof(CreateProductCommand.Tax), Aliases = new[] { "Tax" }, Hint = "خالی = ۰" },
                new() { Key = "taxCategory", Header = "وضعیت مالیاتی", Type = DataFieldTypeEnum.Enum, EnumType = typeof(TaxCategoryEnum), Property = nameof(CreateProductCommand.TaxCategory), Aliases = new[] { "Tax Category" }, Hint = "خالی = مشمول مالیات" },
                new() { Key = "lowStockThreshold", Header = "حداقل موجودی", Type = DataFieldTypeEnum.Integer, MinValue = 0, MaxValue = int.MaxValue, Property = nameof(CreateProductCommand.LowStockThreshold), Aliases = new[] { "Minimum Stock" } },
                new() { Key = "requiresUnitTracking", Header = "ردیابی دانه‌ای", Type = DataFieldTypeEnum.Boolean, Property = nameof(CreateProductCommand.RequiresUnitTracking), Hint = "بله / خیر (خالی = خیر)" },
            },
            ForeignKeys = new List<ForeignKeyLookup>
            {
                new()
                {
                    ColumnKey = "category",
                    EntityTitle = "دسته‌بندی",
                    // Categories are a short list; normalizing in memory lets "لوازم يدكي" (Arabic letters) find
                    // "لوازم یدکی", which a SQL equality would not.
                    ResolveAsync = async (keys, ct) =>
                    {
                        var categories = await _context.ProductCategories.Where(c => c.IsActive)
                            .OrderBy(c => c.Id).Select(c => new { c.Id, c.Name }).ToListAsync(ct);
                        var byKey = new Dictionary<string, int>();
                        foreach (var category in categories)
                            if (DataValues.NormalizeKey(category.Name) is { } key) byKey.TryAdd(key, category.Id);
                        return keys.Where(byKey.ContainsKey).ToDictionary(k => k, k => byKey[k]);
                    },
                },
            },
            DuplicateKeys = new List<DuplicateKey<CreateProductCommand>>
            {
                new()
                {
                    Title = "نام و برند",
                    ColumnKey = "name",
                    Select = c => string.IsNullOrWhiteSpace(c.Name) ? null : $"{c.Name}|{c.Brand}",
                    FindExistingAsync = async (keys, ct) =>
                    {
                        // Two string columns of every active product; compared normalized for the same reason as categories.
                        var existing = await _context.Products.Where(p => p.IsActive).Select(p => new { p.Name, p.Brand }).ToListAsync(ct);
                        var wanted = keys.ToHashSet();
                        return existing.Select(p => DataValues.NormalizeKey($"{p.Name}|{p.Brand}"))
                            .Where(k => k != null && wanted.Contains(k)).Select(k => k!).ToHashSet();
                    },
                },
            },
            Map = row => new CreateProductCommand
            {
                Name = row.Text("name")!,
                EnglishName = row.Text("englishName"),
                Brand = row.Text("brand")!,
                ProductCategoryId = row.ReferenceId("category") ?? 0,
                Unit = row.Enum<ProductUnitEnum>("unit") ?? default,
                PurchasePrice = row.Int32("purchasePrice") ?? 0,
                RetailPrice = row.Int32("retailPrice") ?? 0,
                WholeSalePrice = row.Int32("wholeSalePrice") ?? 0,
                Tax = row.Int32("tax") ?? 0,
                TaxCategory = row.Enum<TaxCategoryEnum>("taxCategory") ?? TaxCategoryEnum.TAXABLE,
                LowStockThreshold = row.Int32("lowStockThreshold") ?? 0,
                RequiresUnitTracking = row.Boolean("requiresUnitTracking") ?? false,
                Stock = 0,
                IsIncomplete = false,
            },
            CommitBatchAsync = async (commands, ct) =>
            {
                // The handler's two steps, batched: one insert round for the batch, then codes from the new ids.
                var products = commands.Select(c => CreateProductCommandHandler.BuildEntity(c, _mapper, _objectStorageService)).ToList();
                await _context.Products.AddRangeAsync(products, ct);
                await _unitOfWork.SaveChangesAsync(ct);

                foreach (var product in products)
                    await CreateProductCommandHandler.CompleteAfterInsertAsync(product, _productCodeService, _productUnitService, _inventoryCostingService, ct);

                await _unitOfWork.SaveChangesAsync(ct);
            },
        };
    }

    /// <summary>The exported shape. Anything not listed here cannot reach a file.</summary>
    public class ProductExportRow
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? EnglishName { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public ProductUnitEnum Unit { get; set; }
        public string BarCode { get; set; } = string.Empty;
        public string? SupplierBarCode { get; set; }
        public ulong PurchasePrice { get; set; }
        public ulong RetailPrice { get; set; }
        public ulong WholeSalePrice { get; set; }
        public int Tax { get; set; }
        public TaxCategoryEnum TaxCategory { get; set; }
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }
        public bool RequiresUnitTracking { get; set; }
    }
}
