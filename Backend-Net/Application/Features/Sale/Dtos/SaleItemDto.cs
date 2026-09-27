namespace Application.Features.Sale.Dtos
{
    public class SaleItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }

        // Invoice snapshot, computed by the server (InvoiceLineMath): tax taken from the product, amounts in whole rials.
        public Domain.Enums.TaxCategoryEnum TaxCategory { get; set; }
        public int TaxPercent { get; set; }
        public UInt64 GrossAmount { get; set; }
        public UInt64 DiscountAmount { get; set; }
        public UInt64 NetAmount { get; set; }
        public UInt64 TaxAmount { get; set; }
        public UInt64 TotalAmount { get; set; }
        public int ShippedQuantity { get; set; }
        public int SettledQuantity { get; set; }

        public string ProductCode { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;

        /// <summary>
        /// How much of this line a new ON_ORDER claim may still take: shipped - settled - what open claims of other returns
        /// already reserve. The same number CreateSaleReturn enforces (ISaleReturnCalculationService.GetClaimableQuantity).
        /// </summary>
        public int ClaimableQuantity { get; set; }

        /// <summary>
        /// How much an EXCESS claim on this line may still take: units that left on it as excess (ShipSale ExcessQuantity, SOLD
        /// with custody EXCESS) minus what open EXCESS claims already reserve. 0 until the warehouse records excess.
        /// </summary>
        public int ClaimableExcessQuantity { get; set; }
        public int SaleId { get; set; }
    }
}
