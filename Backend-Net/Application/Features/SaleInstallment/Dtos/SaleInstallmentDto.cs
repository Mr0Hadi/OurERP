using Domain.Enums;

namespace Application.Features.SaleInstallment.Dtos
{
    /// <summary>یک سطر قسط، همان‌طور که در جزئیات پلن دیده می‌شود.</summary>
    public class SaleInstallmentDto
    {
        public int Id { get; set; }
        public int Number { get; set; }
        public DateTime DueDate { get; set; }
        public UInt64 Amount { get; set; }
        public SaleInstallmentStatusEnum Status { get; set; }
        public string StatusTitle { get; set; } = string.Empty;
        public DateTime? PaidAt { get; set; }
        public PaymentTypeEnum? PaymentType { get; set; }
        public int? PaymentDetailId { get; set; }

        /// <summary>Paid rows: the late penalty charged with the payment (not part of Amount).</summary>
        public UInt64 PenaltyAmount { get; set; }

        /// <summary>Unpaid rows: days late today (after the grace days) and the penalty paying today would charge, waiver included.</summary>
        public int DaysLate { get; set; }
        public UInt64 PenaltyDue { get; set; }

        public UInt64 PenaltyWaivedAmount { get; set; }
        public string? PenaltyWaiveReason { get; set; }

        /// <summary>What an early settlement took off this row's Amount.</summary>
        public UInt64 EarlySettlementDiscountAmount { get; set; }
    }
}
