using Domain.Enums;

namespace Application.Common.Dtos
{
    public class PaymentDetailDto
    {
        public Guid Id { get; set; }
        public PaymentTypeEnum Type { get; set; }
        public decimal Amount { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
    }
}
