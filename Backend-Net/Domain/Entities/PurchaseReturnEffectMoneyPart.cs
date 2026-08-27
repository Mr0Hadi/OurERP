using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>One split of a MIXED-method money effect. Sum(Amount) across parts equals the effect's Amount.</summary>
    public class PurchaseReturnEffectMoneyPart
    {
        public int Id { get; set; }
        public int PurchaseReturnEffectId { get; set; }
        public ReturnPaymentMethodEnum Method { get; set; }
        public UInt64 Amount { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }

        public PurchaseReturnEffect? PurchaseReturnEffect { get; set; }
    }
}
