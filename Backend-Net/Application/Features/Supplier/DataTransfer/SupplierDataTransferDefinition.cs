using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.DataTransfer;
using Application.Features.Supplier.Commands;
using Application.Features.Supplier.Queries;
using AutoMapper;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Supplier.DataTransfer
{
    /// <summary>
    /// Suppliers in and out of CSV/XLSX. Rows become CreateSupplierCommand and are built by
    /// CreateSupplierCommandHandler.BuildEntity. A supplier is identified by its company name, economic code or
    /// national id; a row matching an existing one on any of them is skipped.
    /// </summary>
    public class SupplierDataTransferDefinition : IDataTransferDefinition
    {
        private readonly IWMSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public SupplierDataTransferDefinition(IWMSDbContext context, IMapper mapper, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _mapper = mapper;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public string Resource => "suppliers";

        public string Title => "تامین‌کنندگان";

        public IExportSpec Export => new ExportSpec<GetSupplierListQuery, SupplierExportRow>
        {
            Permission = PermissionEnum.SupplierExport,
            Query = (filter, ct) => Task.FromResult(
                GetSupplierListQueryHandler.ApplyFilters(_context.Suppliers.Where(x => x.IsActive).AsNoTracking(), filter)
                    .OrderBy(x => x.Id)
                    .Select(x => new SupplierExportRow
                    {
                        CompanyName = x.CompanyName,
                        FirstName = x.FirstName,
                        LastName = x.LastName,
                        Phone = x.Phone,
                        EconomicCode = x.EconomicCode,
                        NationalId = x.NationalId,
                        RegistrationNumber = x.RegistrationNumber,
                        Province = x.Province,
                        City = x.City,
                        Address = x.Address,
                        PostalCode = x.PostalCode,
                        Balance = x.Balance,
                        BalanceType = x.BalanceType,
                        Description = x.Description,
                    })),
            Fields = new List<ExportColumn<SupplierExportRow>>
            {
                new() { Key = "companyName", Header = "نام شرکت", Value = r => r.CompanyName },
                new() { Key = "firstName", Header = "نام مسئول", Value = r => r.FirstName },
                new() { Key = "lastName", Header = "نام خانوادگی مسئول", Value = r => r.LastName },
                new() { Key = "phone", Header = "شماره تماس", Value = r => r.Phone },
                new() { Key = "economicCode", Header = "کد اقتصادی", Value = r => r.EconomicCode },
                new() { Key = "nationalId", Header = "شناسه ملی", Value = r => r.NationalId },
                new() { Key = "registrationNumber", Header = "شماره ثبت", Value = r => r.RegistrationNumber },
                new() { Key = "province", Header = "استان", Value = r => r.Province },
                new() { Key = "city", Header = "شهر", Value = r => r.City },
                new() { Key = "address", Header = "آدرس", Value = r => r.Address },
                new() { Key = "postalCode", Header = "کد پستی", Value = r => r.PostalCode },
                new() { Key = "balance", Header = "مانده", Type = DataFieldTypeEnum.Integer, Value = r => r.Balance },
                new() { Key = "balanceType", Header = "نوع مانده", Type = DataFieldTypeEnum.Enum, Value = r => r.BalanceType },
                new() { Key = "description", Header = "توضیحات", Value = r => r.Description },
            },
        };

        public IImportSpec Import => new ImportSpec<CreateSupplierCommand>
        {
            Permission = PermissionEnum.SupplierImport,
            Columns = new List<ImportColumn>
            {
                new() { Key = "companyName", Header = "نام شرکت", Required = true, Property = nameof(CreateSupplierCommand.CompanyName), MaxLength = 200, Aliases = new[] { "Company Name" } },
                new() { Key = "firstName", Header = "نام مسئول", Property = nameof(CreateSupplierCommand.FirstName), MaxLength = 100, Hint = "اگر نام مسئول بیاید، نام خانوادگی او هم لازم است." },
                new() { Key = "lastName", Header = "نام خانوادگی مسئول", Property = nameof(CreateSupplierCommand.LastName), MaxLength = 100 },
                new() { Key = "phone", Header = "شماره تماس", Required = true, AsciiDigits = true, Property = nameof(CreateSupplierCommand.Phone), MaxLength = 20, Aliases = new[] { "Phone" },
                    Hint = "موبایل، مثل 09121234567" },
                new() { Key = "economicCode", Header = "کد اقتصادی", AsciiDigits = true, Property = nameof(CreateSupplierCommand.EconomicCode), MaxLength = 30 },
                new() { Key = "nationalId", Header = "شناسه ملی", AsciiDigits = true, Property = nameof(CreateSupplierCommand.NationalId), MaxLength = 20 },
                new() { Key = "registrationNumber", Header = "شماره ثبت", AsciiDigits = true, Property = nameof(CreateSupplierCommand.RegistrationNumber), MaxLength = 30 },
                new() { Key = "province", Header = "استان", Property = nameof(CreateSupplierCommand.Province), MaxLength = 100 },
                new() { Key = "city", Header = "شهر", Property = nameof(CreateSupplierCommand.City), MaxLength = 100 },
                new() { Key = "address", Header = "آدرس", Required = true, Property = nameof(CreateSupplierCommand.Address), MaxLength = 500 },
                new() { Key = "postalCode", Header = "کد پستی", AsciiDigits = true, Property = nameof(CreateSupplierCommand.PostalCode), MaxLength = 20 },
                new() { Key = "balance", Header = "مانده", Type = DataFieldTypeEnum.Integer, MinValue = 0, Property = nameof(CreateSupplierCommand.Balance) },
                new() { Key = "balanceType", Header = "نوع مانده", Type = DataFieldTypeEnum.Enum, EnumType = typeof(BalanceTypeEnum), Property = nameof(CreateSupplierCommand.BalanceType), Hint = "خالی = تسویه شده" },
                new() { Key = "description", Header = "توضیحات", Property = nameof(CreateSupplierCommand.Description), MaxLength = 1000 },
            },
            DuplicateKeys = new List<DuplicateKey<CreateSupplierCommand>>
            {
                new()
                {
                    Title = "نام شرکت",
                    ColumnKey = "companyName",
                    Select = c => c.CompanyName,
                    // Names compare normalized (Arabic/Persian letters, spacing), so every active name is read once.
                    FindExistingAsync = async (keys, ct) =>
                    {
                        var wanted = keys.ToHashSet();
                        var names = await _context.Suppliers.Where(x => x.IsActive).Select(x => x.CompanyName).ToListAsync(ct);
                        return names.Select(DataValues.NormalizeKey).Where(k => k != null && wanted.Contains(k)).Select(k => k!).ToHashSet();
                    },
                },
                new()
                {
                    Title = "کد اقتصادی",
                    ColumnKey = "economicCode",
                    Select = c => c.EconomicCode,
                    FindExistingAsync = async (keys, ct) => (await _context.Suppliers
                        .Where(x => x.IsActive && x.EconomicCode != null && keys.Contains(x.EconomicCode))
                        .Select(x => x.EconomicCode!).ToListAsync(ct)).Select(k => DataValues.NormalizeKey(k)!).ToHashSet(),
                },
                new()
                {
                    Title = "شناسه ملی",
                    ColumnKey = "nationalId",
                    Select = c => c.NationalId,
                    FindExistingAsync = async (keys, ct) => (await _context.Suppliers
                        .Where(x => x.IsActive && x.NationalId != null && keys.Contains(x.NationalId))
                        .Select(x => x.NationalId!).ToListAsync(ct)).Select(k => DataValues.NormalizeKey(k)!).ToHashSet(),
                },
            },
            Map = row => new CreateSupplierCommand
            {
                CompanyName = row.Text("companyName")!,
                FirstName = row.Text("firstName") ?? string.Empty,
                LastName = row.Text("lastName") ?? string.Empty,
                Phone = row.Text("phone")!,
                EconomicCode = row.Text("economicCode"),
                NationalId = row.Text("nationalId"),
                RegistrationNumber = row.Text("registrationNumber"),
                Province = row.Text("province"),
                City = row.Text("city"),
                Address = row.Text("address")!,
                PostalCode = row.Text("postalCode") ?? string.Empty,
                Balance = row.Integer("balance") is { } balance ? (ulong)balance : null,
                BalanceType = row.Enum<BalanceTypeEnum>("balanceType") ?? BalanceTypeEnum.Balanced,
                Description = row.Text("description"),
            },
            CommitBatchAsync = async (commands, ct) =>
            {
                var suppliers = commands.Select(c => CreateSupplierCommandHandler.BuildEntity(c, _mapper, _objectStorageService)).ToList();
                await _context.Suppliers.AddRangeAsync(suppliers, ct);
                await _unitOfWork.SaveChangesAsync(ct);
            },
        };
    }

    /// <summary>The exported shape. Anything not listed here cannot reach a file.</summary>
    public class SupplierExportRow
    {
        public string CompanyName { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? EconomicCode { get; set; }
        public string? NationalId { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? Province { get; set; }
        public string? City { get; set; }
        public string Address { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public ulong? Balance { get; set; }
        public BalanceTypeEnum? BalanceType { get; set; }
        public string? Description { get; set; }
    }
}
