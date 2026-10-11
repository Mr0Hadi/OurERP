using Domain.Enums;

namespace Application.Features.Accounting.Dtos
{
    /// <summary>
    /// One sale invoice in the sales journal (دفتر فروش). Amounts are the stored ones: line amounts summed from the
    /// lines, TotalAmount as issued. Payable = TotalAmount, or the live installment plan's total (invoice + charge).
    /// Remaining = Payable - Paid (negative = overpaid).
    /// </summary>
    public class SaleJournalRowDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }

        /// <summary>PaymentDate, else InvoiceDate - what aging and "overdue" count from.</summary>
        public DateTime? DueDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public int? SalesUserId { get; set; }
        public string? SalesUserName { get; set; }
        public int ItemCount { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public bool HasInstallmentPlan { get; set; }
        public decimal InstallmentChargeAmount { get; set; }
        public decimal PayableAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }

        /// <summary>Days past DueDate while something is still owed; null otherwise. Filled after paging.</summary>
        public int? OverdueDays { get; set; }
    }

    /// <summary>
    /// One purchase invoice in the purchase journal (دفتر خرید). ShortClosedAmount is the undelivered share of lines
    /// closed short (the same function the ledger's PURCHASE_SHORT_CLOSE row uses); Payable = Total - ShortClosed.
    /// Remaining = Payable - Paid: what we still owe the supplier.
    /// </summary>
    public class PurchaseJournalRowDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public DateTime? DueDate { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public int? PurchasingUserId { get; set; }
        public string? PurchasingUserName { get; set; }
        public int ItemCount { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal ShortClosedAmount { get; set; }
        public decimal PayableAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public int? OverdueDays { get; set; }
    }

    /// <summary>Totals of every invoice matching a journal's filter (not just the page), for the table footer.</summary>
    public class JournalSummaryDto
    {
        public int Count { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }

        /// <summary>Sales: installment charge on live plans. Purchases: always 0.</summary>
        public decimal InstallmentChargeAmount { get; set; }

        /// <summary>Purchases: undelivered share of lines closed short. Sales: always 0.</summary>
        public decimal ShortClosedAmount { get; set; }
        public decimal PayableAmount { get; set; }
        public decimal PaidAmount { get; set; }

        /// <summary>Sum of positive remainders only - what is still owed. Overpayments are not netted against it.</summary>
        public decimal RemainingAmount { get; set; }
    }

    /// <summary>One line of the sales line journal (ریز اقلام فروش). Amounts are the line's stored amounts.</summary>
    public class SaleLineJournalRowDto
    {
        public int Id { get; set; }
        public int SaleId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime? InvoiceDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public int ProductId { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int ProductCategoryId { get; set; }
        public string ProductCategoryName { get; set; } = string.Empty;
        public ProductUnitEnum Unit { get; set; }
        public int Quantity { get; set; }
        public int ShippedQuantity { get; set; }
        public decimal UnitPrice { get; set; }

        /// <summary>Line discount, percent.</summary>
        public int DiscountPercent { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public TaxCategoryEnum TaxCategory { get; set; }
        public int TaxPercent { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class SaleLineJournalSummaryDto
    {
        public int Count { get; set; }
        public int Quantity { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }
}
