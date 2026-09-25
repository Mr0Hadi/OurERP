using Domain.Enums;

namespace Domain.Entities
{
    public class PurchaseItem : IInvoiceLine
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }

        // ---- invoice snapshot (IInvoiceLine, written by InvoiceLineMath.Stamp) ----
        public TaxCategoryEnum TaxCategory { get; set; } = TaxCategoryEnum.TAXABLE;
        public int TaxPercent { get; set; }
        public UInt64 GrossAmount { get; set; }
        public UInt64 DiscountAmount { get; set; }
        public UInt64 NetAmount { get; set; }
        public UInt64 TaxAmount { get; set; }
        public UInt64 TotalAmount { get; set; }
        public int ReceivedQuantity { get; set; }
        public int SettledQuantity { get; set; }

        /// <summary>
        /// Ordered units the supplier will never deliver, written off the line by ClosePurchaseItemCommand (SAP's "delivery
        /// completed"): Quantity - ReceivedQuantity at the moment of closing, 0 while the line is open. They stop being owed, so
        /// the purchase can reach RECEIVED and anything that still arrives on the line is excess. Nothing about money moves.
        /// </summary>
        public int ShortClosedQuantity { get; set; }

        /// <summary>When the line was closed short; null while open.</summary>
        public DateTime? ShortClosedAt { get; set; }

        /// <summary>
        /// A line added to an already-issued invoice by AcceptPurchaseExcessCommand. An issued invoice is never edited,
        /// only supplemented: accepted excess always becomes a new line, even for a product already on the order, so no
        /// number on the original lines ever changes.
        /// </summary>
        public bool IsSupplement { get; set; }

        /// <summary>For a supplement of excess that arrived on an ordered line: that line. Null for unlisted goods and for
        /// ordinary lines.</summary>
        public int? SupplementOfPurchaseItemId { get; set; }
        public PurchaseItem? SupplementOf { get; set; }

        /// <summary>What the warehouse still expects on this line. The one definition every reader uses.</summary>
        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public int StillOwedQuantity => Math.Max(0, Quantity - ReceivedQuantity - ShortClosedQuantity);
        public Product Product { get; set; }
        public int PurchaseId { get; set; }
        public Purchase Purchase { get; set; }
    }
}
