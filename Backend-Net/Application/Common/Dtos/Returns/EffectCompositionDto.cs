using Domain.Enums;

namespace Application.Common.Dtos.Returns
{
    /// <summary>
    /// The shape the frontend posts when registering a decision against a claim: a bundle of up to
    /// three independent effects (goods coming in, goods going out, money moving) rather than a
    /// single closed decision type. Shared verbatim by both PurchaseReturn and SaleReturn since the
    /// composition shape carries no side-specific fields.
    /// </summary>
    public class EffectCompositionDto
    {
        /// <summary>How much of the claim's remaining quantity this decision covers.</summary>
        public int Quantity { get; set; }
        public string? Note { get; set; }
        public GoodsEffectDto? GoodsIn { get; set; }
        public GoodsEffectDto? GoodsOut { get; set; }
        public MoneyEffectDto? Money { get; set; }
    }

    public class GoodsEffectDto
    {
        public int Quantity { get; set; }

        /// <summary>Product moving. Defaults to the claim's own product when omitted (the common case - same item back/out); set explicitly for a replacement with a different product.</summary>
        public int? ProductId { get; set; }
    }

    public class MoneyEffectDto
    {
        /// <summary>MONEY_IN or MONEY_OUT - which direction this money effect moves, relative to our company.</summary>
        public ReturnEffectKindEnum Kind { get; set; }
        public ReturnPaymentMethodEnum Method { get; set; }
        public ulong Amount { get; set; }
        public string? Reference { get; set; }

        /// <summary>Required, and must sum to Amount, when Method == MIXED.</summary>
        public List<MoneyPartDto>? Parts { get; set; }
    }

    public class MoneyPartDto
    {
        public ReturnPaymentMethodEnum Method { get; set; }
        public ulong Amount { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
    }
}
