using Application.Common.Contracts.Context;
using Application.Common.DataTransfer;
using Application.Features.Accounting.Dtos;
using Application.Features.Accounting.Queries;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Accounting.DataTransfer
{
    // Export-only definitions for the accounting tables. Each one exports exactly what its table shows: the filter class
    // is the table's own query, and the rows come from the same Build/Filter + Sort the handler uses. Figures computed
    // after paging (aging, overdue days) are not in the files - they are not part of the query the export streams.

    public class PartyBalanceDataTransferDefinition : IDataTransferDefinition
    {
        private readonly IWMSDbContext _context;
        public PartyBalanceDataTransferDefinition(IWMSDbContext context) { _context = context; }

        public string Resource => "party-balances";
        public string Title => "مانده حساب اشخاص";
        public IImportSpec? Import => null;

        public IExportSpec Export => new ExportSpec<GetPartyBalanceListQuery, PartyBalanceRowDto>
        {
            Permission = PermissionEnum.AccountingView,
            Query = (filter, ct) => Task.FromResult<IQueryable<PartyBalanceRowDto>>(
                GetPartyBalanceListQueryHandler.Sort(GetPartyBalanceListQueryHandler.Build(_context, filter), filter.SortBy, filter.SortDirection)),
            Fields = new List<ExportColumn<PartyBalanceRowDto>>
            {
                new() { Key = "partyType", Header = "نوع", Type = DataFieldTypeEnum.Enum, Value = r => r.PartyType },
                new() { Key = "name", Header = "نام", Value = r => r.Name },
                new() { Key = "phone", Header = "تلفن", Value = r => r.Phone },
                new() { Key = "totalDebit", Header = "جمع بدهکار", Type = DataFieldTypeEnum.Decimal, Value = r => r.TotalDebit },
                new() { Key = "totalCredit", Header = "جمع بستانکار", Type = DataFieldTypeEnum.Decimal, Value = r => r.TotalCredit },
                new() { Key = "balance", Header = "مانده", Type = DataFieldTypeEnum.Decimal, Value = r => r.Balance },
                new() { Key = "creditLimit", Header = "سقف اعتبار", Type = DataFieldTypeEnum.Decimal, Value = r => r.CreditLimit },
                new() { Key = "lastEntryAt", Header = "آخرین گردش", Type = DataFieldTypeEnum.Date, Value = r => r.LastEntryAt },
                new() { Key = "lastPaymentAt", Header = "آخرین پرداخت", Type = DataFieldTypeEnum.Date, Value = r => r.LastPaymentAt },
            },
        };
    }

    public class PartyLedgerDataTransferDefinition : IDataTransferDefinition
    {
        private readonly IWMSDbContext _context;
        public PartyLedgerDataTransferDefinition(IWMSDbContext context) { _context = context; }

        public string Resource => "party-ledger";
        public string Title => "دفتر حساب اشخاص";
        public IImportSpec? Import => null;

        public IExportSpec Export => new ExportSpec<GetPartyLedgerEntryListQuery, PartyLedgerEntryRowDto>
        {
            Permission = PermissionEnum.AccountingView,
            Query = (filter, ct) => Task.FromResult<IQueryable<PartyLedgerEntryRowDto>>(GetPartyLedgerEntryListQueryHandler.Sort(
                GetPartyLedgerEntryListQueryHandler.Project(_context, GetPartyLedgerEntryListQueryHandler.Filter(_context, filter)), filter.SortBy, filter.SortDirection)),
            Fields = new List<ExportColumn<PartyLedgerEntryRowDto>>
            {
                new() { Key = "occurredAt", Header = "تاریخ", Type = DataFieldTypeEnum.Date, Value = r => r.OccurredAt },
                new() { Key = "partyType", Header = "نوع طرف حساب", Type = DataFieldTypeEnum.Enum, Value = r => r.PartyType },
                new() { Key = "partyName", Header = "طرف حساب", Value = r => r.PartyName },
                new() { Key = "entryType", Header = "نوع ردیف", Type = DataFieldTypeEnum.Enum, Value = r => r.EntryType },
                new() { Key = "invoiceNumber", Header = "شماره فاکتور", Value = r => r.InvoiceNumber },
                new() { Key = "description", Header = "شرح", Value = r => r.Description },
                new() { Key = "debit", Header = "بدهکار", Type = DataFieldTypeEnum.Decimal, Value = r => r.Debit },
                new() { Key = "credit", Header = "بستانکار", Type = DataFieldTypeEnum.Decimal, Value = r => r.Credit },
                new() { Key = "paymentType", Header = "روش پرداخت", Type = DataFieldTypeEnum.Enum, Value = r => r.PaymentType },
                new() { Key = "isReversed", Header = "برگشت‌خورده", Type = DataFieldTypeEnum.Boolean, Value = r => r.IsReversed },
            },
        };
    }

    public class SaleJournalDataTransferDefinition : IDataTransferDefinition
    {
        private readonly IWMSDbContext _context;
        public SaleJournalDataTransferDefinition(IWMSDbContext context) { _context = context; }

        public string Resource => "sale-journal";
        public string Title => "دفتر فروش";
        public IImportSpec? Import => null;

        public IExportSpec Export => new ExportSpec<GetSaleJournalQuery, SaleJournalRowDto>
        {
            Permission = PermissionEnum.AccountingView,
            Query = (filter, ct) => Task.FromResult<IQueryable<SaleJournalRowDto>>(GetSaleJournalQueryHandler.Sort(
                GetSaleJournalQueryHandler.Build(_context, filter, DateTime.Now), filter.SortBy, filter.SortDirection)),
            Fields = new List<ExportColumn<SaleJournalRowDto>>
            {
                new() { Key = "invoiceNumber", Header = "شماره فاکتور", Value = r => r.InvoiceNumber },
                new() { Key = "invoiceDate", Header = "تاریخ فاکتور", Type = DataFieldTypeEnum.Date, Value = r => r.InvoiceDate },
                new() { Key = "dueDate", Header = "سررسید", Type = DataFieldTypeEnum.Date, Value = r => r.DueDate },
                new() { Key = "status", Header = "وضعیت", Type = DataFieldTypeEnum.Enum, Value = r => r.Status },
                new() { Key = "paymentType", Header = "نوع پرداخت", Type = DataFieldTypeEnum.Enum, Value = r => r.PaymentType },
                new() { Key = "customerName", Header = "مشتری", Value = r => r.CustomerName },
                new() { Key = "salesUserName", Header = "فروشنده", Value = r => r.SalesUserName },
                new() { Key = "grossAmount", Header = "مبلغ ناخالص", Type = DataFieldTypeEnum.Decimal, Value = r => r.GrossAmount },
                new() { Key = "discountAmount", Header = "تخفیف", Type = DataFieldTypeEnum.Decimal, Value = r => r.DiscountAmount },
                new() { Key = "netAmount", Header = "مبلغ خالص", Type = DataFieldTypeEnum.Decimal, Value = r => r.NetAmount },
                new() { Key = "taxAmount", Header = "مالیات", Type = DataFieldTypeEnum.Decimal, Value = r => r.TaxAmount },
                new() { Key = "totalAmount", Header = "جمع فاکتور", Type = DataFieldTypeEnum.Decimal, Value = r => r.TotalAmount },
                new() { Key = "installmentChargeAmount", Header = "سود اقساط", Type = DataFieldTypeEnum.Decimal, Value = r => r.InstallmentChargeAmount },
                new() { Key = "payableAmount", Header = "قابل پرداخت", Type = DataFieldTypeEnum.Decimal, Value = r => r.PayableAmount },
                new() { Key = "paidAmount", Header = "پرداخت‌شده", Type = DataFieldTypeEnum.Decimal, Value = r => r.PaidAmount },
                new() { Key = "remainingAmount", Header = "مانده", Type = DataFieldTypeEnum.Decimal, Value = r => r.RemainingAmount },
            },
        };
    }

    public class PurchaseJournalDataTransferDefinition : IDataTransferDefinition
    {
        private readonly IWMSDbContext _context;
        public PurchaseJournalDataTransferDefinition(IWMSDbContext context) { _context = context; }

        public string Resource => "purchase-journal";
        public string Title => "دفتر خرید";
        public IImportSpec? Import => null;

        public IExportSpec Export => new ExportSpec<GetPurchaseJournalQuery, PurchaseJournalRowDto>
        {
            Permission = PermissionEnum.AccountingView,
            Query = (filter, ct) => Task.FromResult<IQueryable<PurchaseJournalRowDto>>(GetPurchaseJournalQueryHandler.Sort(
                GetPurchaseJournalQueryHandler.Build(_context, filter, DateTime.Now), filter.SortBy, filter.SortDirection)),
            Fields = new List<ExportColumn<PurchaseJournalRowDto>>
            {
                new() { Key = "invoiceNumber", Header = "شماره فاکتور", Value = r => r.InvoiceNumber },
                new() { Key = "invoiceDate", Header = "تاریخ فاکتور", Type = DataFieldTypeEnum.Date, Value = r => r.InvoiceDate },
                new() { Key = "dueDate", Header = "سررسید", Type = DataFieldTypeEnum.Date, Value = r => r.DueDate },
                new() { Key = "status", Header = "وضعیت", Type = DataFieldTypeEnum.Enum, Value = r => r.Status },
                new() { Key = "paymentType", Header = "نوع پرداخت", Type = DataFieldTypeEnum.Enum, Value = r => r.PaymentType },
                new() { Key = "supplierName", Header = "تامین‌کننده", Value = r => r.SupplierName },
                new() { Key = "purchasingUserName", Header = "کاربر خرید", Value = r => r.PurchasingUserName },
                new() { Key = "grossAmount", Header = "مبلغ ناخالص", Type = DataFieldTypeEnum.Decimal, Value = r => r.GrossAmount },
                new() { Key = "discountAmount", Header = "تخفیف", Type = DataFieldTypeEnum.Decimal, Value = r => r.DiscountAmount },
                new() { Key = "netAmount", Header = "مبلغ خالص", Type = DataFieldTypeEnum.Decimal, Value = r => r.NetAmount },
                new() { Key = "taxAmount", Header = "مالیات", Type = DataFieldTypeEnum.Decimal, Value = r => r.TaxAmount },
                new() { Key = "totalAmount", Header = "جمع فاکتور", Type = DataFieldTypeEnum.Decimal, Value = r => r.TotalAmount },
                new() { Key = "shortClosedAmount", Header = "کسری بسته‌شده", Type = DataFieldTypeEnum.Decimal, Value = r => r.ShortClosedAmount },
                new() { Key = "payableAmount", Header = "قابل پرداخت", Type = DataFieldTypeEnum.Decimal, Value = r => r.PayableAmount },
                new() { Key = "paidAmount", Header = "پرداخت‌شده", Type = DataFieldTypeEnum.Decimal, Value = r => r.PaidAmount },
                new() { Key = "remainingAmount", Header = "مانده", Type = DataFieldTypeEnum.Decimal, Value = r => r.RemainingAmount },
            },
        };
    }

    public class SaleLineJournalDataTransferDefinition : IDataTransferDefinition
    {
        private readonly IWMSDbContext _context;
        public SaleLineJournalDataTransferDefinition(IWMSDbContext context) { _context = context; }

        public string Resource => "sale-lines";
        public string Title => "ریز اقلام فروش";
        public IImportSpec? Import => null;

        public IExportSpec Export => new ExportSpec<GetSaleLineJournalQuery, SaleLineJournalRowDto>
        {
            Permission = PermissionEnum.AccountingView,
            Query = (filter, ct) => Task.FromResult<IQueryable<SaleLineJournalRowDto>>(GetSaleLineJournalQueryHandler.Sort(
                GetSaleLineJournalQueryHandler.Build(_context, filter), filter.SortBy, filter.SortDirection)),
            Fields = new List<ExportColumn<SaleLineJournalRowDto>>
            {
                new() { Key = "invoiceNumber", Header = "شماره فاکتور", Value = r => r.InvoiceNumber },
                new() { Key = "invoiceDate", Header = "تاریخ فاکتور", Type = DataFieldTypeEnum.Date, Value = r => r.InvoiceDate },
                new() { Key = "customerName", Header = "مشتری", Value = r => r.CustomerName },
                new() { Key = "productCode", Header = "کد کالا", Value = r => r.ProductCode },
                new() { Key = "productName", Header = "کالا", Value = r => r.ProductName },
                new() { Key = "productCategoryName", Header = "دسته‌بندی", Value = r => r.ProductCategoryName },
                new() { Key = "unit", Header = "واحد", Type = DataFieldTypeEnum.Enum, Value = r => r.Unit },
                new() { Key = "quantity", Header = "تعداد", Type = DataFieldTypeEnum.Integer, Value = r => r.Quantity },
                new() { Key = "unitPrice", Header = "فی", Type = DataFieldTypeEnum.Decimal, Value = r => r.UnitPrice },
                new() { Key = "discountPercent", Header = "درصد تخفیف", Type = DataFieldTypeEnum.Integer, Value = r => r.DiscountPercent },
                new() { Key = "grossAmount", Header = "مبلغ ناخالص", Type = DataFieldTypeEnum.Decimal, Value = r => r.GrossAmount },
                new() { Key = "discountAmount", Header = "تخفیف", Type = DataFieldTypeEnum.Decimal, Value = r => r.DiscountAmount },
                new() { Key = "netAmount", Header = "مبلغ خالص", Type = DataFieldTypeEnum.Decimal, Value = r => r.NetAmount },
                new() { Key = "taxPercent", Header = "درصد مالیات", Type = DataFieldTypeEnum.Integer, Value = r => r.TaxPercent },
                new() { Key = "taxAmount", Header = "مالیات", Type = DataFieldTypeEnum.Decimal, Value = r => r.TaxAmount },
                new() { Key = "totalAmount", Header = "جمع", Type = DataFieldTypeEnum.Decimal, Value = r => r.TotalAmount },
            },
        };
    }

    public class PaymentJournalDataTransferDefinition : IDataTransferDefinition
    {
        private readonly IWMSDbContext _context;
        public PaymentJournalDataTransferDefinition(IWMSDbContext context) { _context = context; }

        public string Resource => "payment-journal";
        public string Title => "دفتر دریافت و پرداخت";
        public IImportSpec? Import => null;

        public IExportSpec Export => new ExportSpec<GetPaymentJournalQuery, PaymentJournalRowDto>
        {
            Permission = PermissionEnum.AccountingView,
            Query = (filter, ct) => Task.FromResult<IQueryable<PaymentJournalRowDto>>(GetPaymentJournalQueryHandler.Sort(
                GetPaymentJournalQueryHandler.Project(GetPaymentJournalQueryHandler.Filter(_context, filter)), filter.SortBy, filter.SortDirection)),
            Fields = new List<ExportColumn<PaymentJournalRowDto>>
            {
                new() { Key = "paidAt", Header = "تاریخ پرداخت", Type = DataFieldTypeEnum.Date, Value = r => r.PaidAt },
                new() { Key = "direction", Header = "جهت", Type = DataFieldTypeEnum.Enum, Value = r => r.Direction },
                new() { Key = "type", Header = "روش", Type = DataFieldTypeEnum.Enum, Value = r => r.Type },
                new() { Key = "purpose", Header = "بابت", Type = DataFieldTypeEnum.Enum, Value = r => r.Purpose },
                new() { Key = "amount", Header = "مبلغ", Type = DataFieldTypeEnum.Decimal, Value = r => r.Amount },
                new() { Key = "invoiceNumber", Header = "شماره فاکتور", Value = r => r.InvoiceNumber },
                new() { Key = "partyName", Header = "طرف حساب", Value = r => r.PartyName },
                new() { Key = "checkNumber", Header = "شماره چک", Value = r => r.CheckNumber },
                new() { Key = "transferRef", Header = "شماره پیگیری", Value = r => r.TransferRef },
                new() { Key = "posTerminalName", Header = "کارتخوان", Value = r => r.PosTerminalName },
                new() { Key = "recordedByName", Header = "ثبت‌کننده", Value = r => r.RecordedByName },
                new() { Key = "voidedAt", Header = "تاریخ ابطال", Type = DataFieldTypeEnum.Date, Value = r => r.VoidedAt },
            },
        };
    }

    public class InventoryValuationDataTransferDefinition : IDataTransferDefinition
    {
        private readonly IWMSDbContext _context;
        public InventoryValuationDataTransferDefinition(IWMSDbContext context) { _context = context; }

        public string Resource => "inventory-valuation";
        public string Title => "ارزش موجودی";
        public IImportSpec? Import => null;

        public IExportSpec Export => new ExportSpec<GetInventoryValuationQuery, InventoryValuationRowDto>
        {
            Permission = PermissionEnum.AccountingView,
            Query = (filter, ct) => Task.FromResult<IQueryable<InventoryValuationRowDto>>(GetInventoryValuationQueryHandler.Sort(
                GetInventoryValuationQueryHandler.Build(_context, filter), filter.SortBy, filter.SortDirection)),
            Fields = new List<ExportColumn<InventoryValuationRowDto>>
            {
                new() { Key = "code", Header = "کد کالا", Value = r => r.Code },
                new() { Key = "name", Header = "کالا", Value = r => r.Name },
                new() { Key = "productCategoryName", Header = "دسته‌بندی", Value = r => r.ProductCategoryName },
                new() { Key = "unit", Header = "واحد", Type = DataFieldTypeEnum.Enum, Value = r => r.Unit },
                new() { Key = "stock", Header = "موجودی", Type = DataFieldTypeEnum.Integer, Value = r => r.Stock },
                new() { Key = "averageCost", Header = "میانگین بها", Type = DataFieldTypeEnum.Decimal, Value = r => r.AverageCost },
                new() { Key = "poolValue", Header = "ارزش قابل فروش", Type = DataFieldTypeEnum.Decimal, Value = r => r.PoolValue },
                new() { Key = "quarantinedQuantity", Header = "تعداد قرنطینه", Type = DataFieldTypeEnum.Integer, Value = r => r.QuarantinedQuantity },
                new() { Key = "offPoolValue", Header = "ارزش قرنطینه", Type = DataFieldTypeEnum.Decimal, Value = r => r.OffPoolValue },
                new() { Key = "totalValue", Header = "ارزش کل", Type = DataFieldTypeEnum.Decimal, Value = r => r.TotalValue },
            },
        };
    }
}
