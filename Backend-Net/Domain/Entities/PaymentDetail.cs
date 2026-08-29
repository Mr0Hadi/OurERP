using Domain.Enums;

namespace Domain.Entities
{
    public class PaymentDetail
    {
        public Guid Id { get; set; }
        public Guid PurchaseId { get; set; }
        public Purchase Purchase { get; set; }
        public PaymentTypeEnum Type { get; set; }
        public decimal Amount { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
    }
}
