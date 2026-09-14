using Domain.Enums;

namespace Domain.Entities
{
    public class ProductUnit
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }

        public int SerialNumber { get; set; }
        public string Barcode { get; set; }
        public string BarcodePayload { get; set; }

        public ProductUnitStatusEnum Status { get; set; }

        public int? PurchaseItemId { get; set; }
        public int? SaleItemId { get; set; }

        /// <summary>The purchase the unit arrived on. Set even without a line - an UNLISTED unit has no PurchaseItemId.</summary>
        public int? PurchaseId { get; set; }

        /// <summary>Why we hold it, for units that came in on a purchase; null otherwise. See UnitCustodyReasonEnum for the one rule allowed to read it.</summary>
        public UnitCustodyReasonEnum? CustodyReason { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? SoldAt { get; set; }
        public bool IsActive { get; set; }
    }
}
