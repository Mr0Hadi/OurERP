using Application.Common.Dtos;
using Application.Features.SaleInstallment.Dtos;
using Domain.Enums;

namespace Application.Features.Sale.Dtos
{
    public class SaleDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; } = new();

        /// <summary>خلاصه‌ی قرارداد اقساطی - فقط برای فروش‌های اقساطی پر می‌شود.</summary>
        public SaleInstallmentSummaryDto? InstallmentSummary { get; set; }
        public UInt64 TotalAmount { get; set; }

        /// <summary>
        /// What the customer pays in total: TotalAmount (the invoice), plus the installment charge on an installment sale
        /// with a live plan. Debt is always PayableAmount - PaidAmount.
        /// </summary>
        public UInt64 PayableAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public List<SaleItemDto> Items { get; set; }
        public List<SaleDriverDto> Drivers { get; set; } = new();
        public List<SaleShippingNoteDto> ShippingNotes { get; set; } = new();
        public List<DocumentAttachmentDto> Attachments { get; set; } = new();
    }

    public class SaleDriverDto
    {
        public int Id { get; set; }
        public string DriverFullName { get; set; }
        public string DriverPhoneNumber { get; set; }
        public string VehiclePlate { get; set; }
    }

    public class SaleShippingNoteDto
    {
        public int Id { get; set; }
        public string Note { get; set; }
    }
}
