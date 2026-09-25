namespace Application.Features.Purchase.Dtos
{
    public class PurchaseItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public string ProductCode { get; set; }
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
        public int ReceivedQuantity { get; set; }
        public int SettledQuantity { get; set; }

        /// <summary>Ordered units the supplier will never deliver (ClosePurchaseItem); 0 while the line is open.</summary>
        public int ShortClosedQuantity { get; set; }
        public DateTime? ShortClosedAt { get; set; }

        /// <summary>Added to the issued invoice by AcceptPurchaseExcess; never part of the original order.</summary>
        public bool IsSupplement { get; set; }

        /// <summary>The ordered line this supplement's excess arrived on; null for unlisted goods and ordinary lines.</summary>
        public int? SupplementOfPurchaseItemId { get; set; }
    }
}
