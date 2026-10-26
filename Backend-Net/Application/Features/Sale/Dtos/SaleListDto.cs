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

        /// <summary>Approval stage while Status == PROFORMA; ProformaStageTitle is null once the invoice is issued.</summary>
        public SaleProformaStageEnum ProformaStage { get; set; }
        public string? ProformaStageTitle { get; set; }

        /// <summary>See SaleDto.IsInPerson.</summary>
        public bool IsInPerson { get; set; }
        public DateTime UpdatedAt { get; set; }

        /// <summary>
        /// While a proforma's units are reserved: when the reservation runs out (payment is refused from then on and the units
        /// go back on the shelf about a minute later). Null when nothing is reserved, after the invoice is issued, or when the
        /// Sale.ReservationMinutes setting is 0.
        /// </summary>
        public DateTime? ReservationExpiresAt { get; set; }

        /// <summary>
        /// Seconds left on the reservation when the server answered (0 = expired), null with <see cref="ReservationExpiresAt"/>.
        /// Drive a countdown from this rather than from the device clock.
        /// </summary>
        public int? ReservationSecondsLeft { get; set; }

        /// <summary>Units the warehouse reported on this sale that accounting has not decided on yet.</summary>
        public int OpenWarehouseIssueCount { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public UInt64 TotalAmount { get; set; }

        /// <summary>What the customer pays in total (invoice + installment charge on a live plan). Debt = PayableAmount - PaidAmount.</summary>
        public UInt64 PayableAmount { get; set; }

        /// <summary>
        /// Returns against this sale (not deleted), and whether one is still open (OPEN/IN_PROGRESS). This replaces the removed
        /// SalesStatusEnum.RETURNED: a return is a document of its own, not a stage of the sale.
        /// </summary>
        public int ReturnCount { get; set; }
        public bool HasOpenReturn { get; set; }
        public UInt64 PaidAmount { get; set; }

        /// <summary>خلاصه‌ی قرارداد اقساطی - فقط برای فروش‌های اقساطی پر می‌شود.</summary>
        public SaleInstallmentSummaryDto? InstallmentSummary { get; set; }
    }
}
