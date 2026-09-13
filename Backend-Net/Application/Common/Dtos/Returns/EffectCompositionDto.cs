using Domain.Enums;

namespace Application.Common.Dtos.Returns
{
    /// <summary>
    /// The shape the frontend posts when registering a decision against a claim: a list of effects of
    /// four kinds (goods in, goods out, money in, money out), in any combination and any quantity,
    /// rather than a single closed decision type. Shared verbatim by both PurchaseReturn and SaleReturn
    /// since the composition shape carries no side-specific fields.
    ///
    /// Direction is expressed structurally on both effect types - which slot the effect sits in IS
    /// its direction. Money used to carry a ReturnEffectDirectionEnum Direction field inside a
    /// single Money slot instead, which defaulted to GOODS_IN (the enum's zero value) and so
    /// rejected every money effect whose sender omitted the field. A slot cannot default to the
    /// wrong direction, so that whole failure mode is gone.
    ///
    /// GoodsIn/GoodsOut are lists, not a single GoodsEffectDto, for the same reason MoneyIn/MoneyOut
    /// already carry a list of parts under MIXED: one resolution can move more than one product in
    /// the same direction or the same product in more than one line. Each item in the list expands
    /// into its own effect row - nothing here forces same-product items to merge into one.
    /// </summary>
    public class EffectCompositionDto
    {
        /// <summary>How much of the claim's remaining quantity this decision covers.</summary>
        public int Quantity { get; set; }
        public string? Note { get; set; }
        public List<GoodsEffectDto>? GoodsIn { get; set; }
        public List<GoodsEffectDto>? GoodsOut { get; set; }

        /// <summary>Money coming in to us.</summary>
        public MoneyEffectDto? MoneyIn { get; set; }

        /// <summary>Money going out from us.</summary>
        public MoneyEffectDto? MoneyOut { get; set; }
    }

    public class GoodsEffectDto
    {
        public int Quantity { get; set; }

        /// <summary>Product moving. Defaults to the claim's own product when omitted.</summary>
        public int? ProductId { get; set; }

        /// <summary>Not read anywhere - ignored by the server. Kept only so existing payloads still bind.</summary>
        public int discount { get; set; }

        /// <summary>
        /// Rial per unit: the transaction value with the counterparty. <b>Required</b> on every goods effect
        /// and may be zero - goods that carry no monetary claim are priced at zero, and that is the client's
        /// call, never inferred by the server. Feeds the money balance
        /// (Application.Common.Returns.ReturnMoneyBalance) and nothing else. Nullable only so an omitted
        /// value is a 400 rather than silently arriving as 0.
        /// </summary>
        public UInt64? UnitPrice { get; set; }

        /// <summary>
        /// Rial per unit: what the goods are worth to us - the cost a GOODS_IN round enters the inventory
        /// pool at. Optional: omitted means the product's running average at the moment the round executes, or
        /// Product.PurchasePrice when that average is 0 (no cost history) - the codebase's one fallback for such stock.
        /// Never read by the balance rule, and GOODS_OUT always leaves at the running average whatever it says.
        /// </summary>
        public UInt64? UnitCost { get; set; }
    }

    /// <summary>
    /// A money movement. Carries no direction of its own - the slot it occupies on
    /// <see cref="EffectCompositionDto"/> decides that, exactly as it does for goods.
    /// </summary>
    public class MoneyEffectDto
    {
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
