using Application.Features.SaleInstallment.Dtos;
using Domain.Enums;

namespace Application.Features.Sale.Dtos
{
    public class SaleListDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public UInt64 TotalAmount { get; set; }

        /// <summary>What the customer pays in total (invoice + installment charge on a live plan). Debt = PayableAmount - PaidAmount.</summary>
        public UInt64 PayableAmount { get; set; }
        public UInt64 PaidAmount { get; set; }

        /// <summary>خلاصه‌ی قرارداد اقساطی - فقط برای فروش‌های اقساطی پر می‌شود.</summary>
        public SaleInstallmentSummaryDto? InstallmentSummary { get; set; }
    }
}
