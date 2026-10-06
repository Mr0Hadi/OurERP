using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.DataTransfer;
using Application.Features.Customer.Commands;
using Application.Features.Customer.Queries;
using AutoMapper;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Customer.DataTransfer
{
    /// <summary>
    /// Customers in and out of CSV/XLSX. Rows become CreateCustomerCommand (its validator: Persian names, a valid mobile
    /// number, an address) and are built by CreateCustomerCommandHandler.BuildEntity. A row whose phone number or national
    /// id already belongs to a customer is skipped, not merged - updating existing records is not this feature.
    /// </summary>
    public class CustomerDataTransferDefinition : IDataTransferDefinition
    {
        private readonly IWMSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public CustomerDataTransferDefinition(IWMSDbContext context, IMapper mapper, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _mapper = mapper;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public string Resource => "customers";

        public string Title => "مشتریان";

        public IExportSpec Export => new ExportSpec<GetCustomerListQuery, CustomerExportRow>
        {
            Permission = PermissionEnum.CustomerExport,
            Query = (filter, ct) => Task.FromResult(
                GetCustomerListQueryHandler.ApplyFilters(_context.Customers.Where(x => x.IsActive).AsNoTracking(), filter)
                    .OrderBy(x => x.Id)
                    .Select(x => new CustomerExportRow
                    {
                        FirstName = x.FirstName,
                        LastName = x.LastName,
                        PhoneNumber = x.PhoneNumber,
                        NationalId = x.NationalId,
                        EconomicCode = x.EconomicCode,
                        RegistrationNumber = x.RegistrationNumber,
                        Province = x.Province,
                        City = x.City,
                        Address = x.Address,
                        PostalCode = x.PostalCode,
                        RefferalCode = x.RefferalCode,
                        CreditLimit = x.CreditLimit,
                        Balance = x.Balance,
                        BalanceType = x.BalanceType,
                        Description = x.Description,
                    })),
            Fields = new List<ExportColumn<CustomerExportRow>>
            {
                new() { Key = "firstName", Header = "نام", Value = r => r.FirstName },
                new() { Key = "lastName", Header = "نام خانوادگی", Value = r => r.LastName },
                new() { Key = "phoneNumber", Header = "شماره تماس", Value = r => r.PhoneNumber },
                new() { Key = "nationalId", Header = "کد ملی", Value = r => r.NationalId },
                new() { Key = "economicCode", Header = "کد اقتصادی", Value = r => r.EconomicCode },
                new() { Key = "registrationNumber", Header = "شماره ثبت", Value = r => r.RegistrationNumber },
                new() { Key = "province", Header = "استان", Value = r => r.Province },
                new() { Key = "city", Header = "شهر", Value = r => r.City },
                new() { Key = "address", Header = "آدرس", Value = r => r.Address },
                new() { Key = "postalCode", Header = "کد پستی", Value = r => r.PostalCode },
                new() { Key = "refferalCode", Header = "کد معرف", Value = r => r.RefferalCode },
                new() { Key = "creditLimit", Header = "سقف اعتبار", Type = DataFieldTypeEnum.Integer, Value = r => r.CreditLimit },
                new() { Key = "balance", Header = "مانده", Type = DataFieldTypeEnum.Integer, Value = r => r.Balance },
                new() { Key = "balanceType", Header = "نوع مانده", Type = DataFieldTypeEnum.Enum, Value = r => r.BalanceType },
                new() { Key = "description", Header = "توضیحات", Value = r => r.Description },
            },
        };

        public IImportSpec Import => new ImportSpec<CreateCustomerCommand>
        {
            Permission = PermissionEnum.CustomerImport,
            Columns = new List<ImportColumn>
            {
                new() { Key = "firstName", Header = "نام", Required = true, Property = nameof(CreateCustomerCommand.FirstName), MaxLength = 100, Aliases = new[] { "First Name" } },
                new() { Key = "lastName", Header = "نام خانوادگی", Required = true, Property = nameof(CreateCustomerCommand.LastName), MaxLength = 100, Aliases = new[] { "Last Name" } },
                new() { Key = "phoneNumber", Header = "شماره تماس", Required = true, AsciiDigits = true, Property = nameof(CreateCustomerCommand.PhoneNumber), MaxLength = 20, Aliases = new[] { "Phone", "موبایل" },
                    Hint = "موبایل، مثل 09121234567" },
                new() { Key = "nationalId", Header = "کد ملی", AsciiDigits = true, Property = nameof(CreateCustomerCommand.NationalId), MaxLength = 20, Aliases = new[] { "National Id" } },
                new() { Key = "economicCode", Header = "کد اقتصادی", AsciiDigits = true, Property = nameof(CreateCustomerCommand.EconomicCode), MaxLength = 30 },
                new() { Key = "registrationNumber", Header = "شماره ثبت", AsciiDigits = true, Property = nameof(CreateCustomerCommand.RegistrationNumber), MaxLength = 30 },
                new() { Key = "province", Header = "استان", Property = nameof(CreateCustomerCommand.Province), MaxLength = 100 },
                new() { Key = "city", Header = "شهر", Property = nameof(CreateCustomerCommand.City), MaxLength = 100 },
                new() { Key = "address", Header = "آدرس", Required = true, Property = nameof(CreateCustomerCommand.Address), MaxLength = 500, Aliases = new[] { "Address" } },
                new() { Key = "postalCode", Header = "کد پستی", AsciiDigits = true, Property = nameof(CreateCustomerCommand.PostalCode), MaxLength = 20 },
                new() { Key = "refferalCode", Header = "کد معرف", Property = nameof(CreateCustomerCommand.RefferalCode), MaxLength = 50 },
                new() { Key = "creditLimit", Header = "سقف اعتبار", Type = DataFieldTypeEnum.Integer, MinValue = 0, Property = nameof(CreateCustomerCommand.CreditLimit) },
                new() { Key = "balance", Header = "مانده", Type = DataFieldTypeEnum.Integer, MinValue = 0, Property = nameof(CreateCustomerCommand.Balance) },
                new() { Key = "balanceType", Header = "نوع مانده", Type = DataFieldTypeEnum.Enum, EnumType = typeof(BalanceTypeEnum), Property = nameof(CreateCustomerCommand.BalanceType), Hint = "خالی = تسویه شده" },
                new() { Key = "description", Header = "توضیحات", Property = nameof(CreateCustomerCommand.Description), MaxLength = 1000 },
            },
            DuplicateKeys = new List<DuplicateKey<CreateCustomerCommand>>
            {
                new()
                {
                    Title = "شماره تماس",
                    ColumnKey = "phoneNumber",
                    Select = c => c.PhoneNumber,
                    FindExistingAsync = async (keys, ct) => (await _context.Customers
                        .Where(x => x.IsActive && keys.Contains(x.PhoneNumber))
                        .Select(x => x.PhoneNumber).ToListAsync(ct)).Select(k => DataValues.NormalizeKey(k)!).ToHashSet(),
                },
                new()
                {
                    Title = "کد ملی",
                    ColumnKey = "nationalId",
                    Select = c => c.NationalId,
                    FindExistingAsync = async (keys, ct) => (await _context.Customers
                        .Where(x => x.IsActive && x.NationalId != null && keys.Contains(x.NationalId))
                        .Select(x => x.NationalId!).ToListAsync(ct)).Select(k => DataValues.NormalizeKey(k)!).ToHashSet(),
                },
            },
            Map = row => new CreateCustomerCommand
            {
                FirstName = row.Text("firstName")!,
                LastName = row.Text("lastName")!,
                PhoneNumber = row.Text("phoneNumber")!,
                NationalId = row.Text("nationalId"),
                EconomicCode = row.Text("economicCode"),
                RegistrationNumber = row.Text("registrationNumber"),
                Province = row.Text("province"),
                City = row.Text("city"),
                Address = row.Text("address")!,
                PostalCode = row.Text("postalCode") ?? string.Empty,
                RefferalCode = row.Text("refferalCode"),
                CreditLimit = row.Integer("creditLimit") is { } limit ? (ulong)limit : null,
                Balance = row.Integer("balance") is { } balance ? (ulong)balance : null,
                BalanceType = row.Enum<BalanceTypeEnum>("balanceType") ?? BalanceTypeEnum.Balanced,
                Description = row.Text("description"),
            },
            CommitBatchAsync = async (commands, ct) =>
            {
                var customers = commands.Select(c => CreateCustomerCommandHandler.BuildEntity(c, _mapper, _objectStorageService)).ToList();
                await _context.Customers.AddRangeAsync(customers, ct);
                await _unitOfWork.SaveChangesAsync(ct);
            },
        };
    }

    /// <summary>The exported shape. Anything not listed here cannot reach a file.</summary>
    public class CustomerExportRow
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? NationalId { get; set; }
        public string? EconomicCode { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? Province { get; set; }
        public string? City { get; set; }
        public string Address { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public string? RefferalCode { get; set; }
        public ulong? CreditLimit { get; set; }
        public ulong? Balance { get; set; }
        public BalanceTypeEnum BalanceType { get; set; }
        public string? Description { get; set; }
    }
}
