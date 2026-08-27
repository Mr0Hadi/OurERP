using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One of the four base movements (GOODS_IN/GOODS_OUT/MONEY_OUT/MONEY_IN) a resolution is
    /// composed of. Goods effects (Quantity/DoneQuantity/RestockedQuantity/ProductId snapshot) and
    /// money effects (Amount/Method/Reference/Parts) share this one row shape - only the fields
    /// relevant to the effect's Kind are populated, matching the frontend's Effect object exactly.
    /// </summary>
    public class SaleReturnEffect
    {
        public int Id { get; set; }
        public int SaleReturnResolutionId { get; set; }
        public ReturnEffectKindEnum Kind { get; set; }

        // Goods effects only (GOODS_IN / GOODS_OUT).
        public int Quantity { get; set; }
        public int DoneQuantity { get; set; }

        /// <summary>GOODS_IN only: portion of DoneQuantity that was healthy and went back to sellable stock.</summary>
        public int? RestockedQuantity { get; set; }
        public int? ProductId { get; set; }

        // Money effects only (MONEY_OUT / MONEY_IN).
        public UInt64? Amount { get; set; }
        public ReturnPaymentMethodEnum? Method { get; set; }
        public string? Reference { get; set; }

        public string? Note { get; set; }
        public ReturnEffectStatusEnum Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? AppliedAt { get; set; }

        public SaleReturnResolution? SaleReturnResolution { get; set; }
        public Product? Product { get; set; }
        public List<SaleReturnEffectRound> History { get; set; } = new();
        public List<SaleReturnEffectMoneyPart> MoneyParts { get; set; } = new();

        [NotMapped]
        public int UndoneQuantity => Quantity - DoneQuantity;
    }
}
