using Domain.Enums;

namespace Application.Common.Dtos.Returns
{
    /// <summary>
    /// One line of a physical goods round against a return effect. Shared by both
    /// PurchaseReturn.ExecuteGoodsRoundCommand and SaleReturn.ExecuteGoodsRoundCommand - the shape
    /// carries no side-specific fields, exactly like <see cref="EffectCompositionDto"/>. The sale
    /// side used to redeclare a byte-identical copy inline in its command file.
    /// </summary>
    public class GoodsRoundLineDto
    {
        public int EffectId { get; set; }
        public int Quantity { get; set; }

        /// <summary>GOODS_IN only: which portion of Quantity had a problem on arrival, and what problem.</summary>
        public List<GoodsRoundObservationDto> Observations { get; set; } = new();
    }

    public class GoodsRoundObservationDto
    {
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
    }
}
