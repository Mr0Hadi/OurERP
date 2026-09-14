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

        /// <summary>
        /// The exact units moved, scanned. Optional; when sent it must hold exactly Quantity distinct barcodes.
        /// Only meaningful where the units already exist: goods leaving us (either side), or a customer's units
        /// coming back on their sale line. Goods that create new units (a purchase-return GOODS_IN, an off-order
        /// sale-return GOODS_IN) have no barcode yet, and sending one is a 400. Omitted: the server picks FIFO.
        /// </summary>
        public List<string>? ProductUnitBarcodes { get; set; }

        /// <summary>
        /// Where the units come from, stated by the warehouse - the server never falls back from one to the other.
        /// Purchase GOODS_OUT: required, IN_STOCK (shelf stock) or QUARANTINED. GOODS_RELEASE/GOODS_SCRAP: QUARANTINED or omitted.
        /// GOODS_IN: must be omitted. Sale returns: omitted, or IN_STOCK on GOODS_OUT.
        /// </summary>
        public ProductUnitStatusEnum? Source { get; set; }

        /// <summary>GOODS_IN only: which portion of Quantity had a problem on arrival, and what problem.</summary>
        public List<GoodsRoundObservationDto> Observations { get; set; } = new();
    }

    public class GoodsRoundObservationDto
    {
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }

        /// <summary>
        /// Which of the line's scanned units have this problem. Required exactly when the line carries
        /// ProductUnitBarcodes and this observation's Quantity is positive: Quantity distinct barcodes, all of them
        /// on the line. Without it the server could not tell which scanned unit is the defective one.
        /// </summary>
        public List<string>? ProductUnitBarcodes { get; set; }
    }
}
