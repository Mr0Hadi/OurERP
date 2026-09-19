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
    }
}
