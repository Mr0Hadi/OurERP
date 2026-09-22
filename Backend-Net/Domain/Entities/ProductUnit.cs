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

        /// <summary>
        /// QUARANTINED units only: the rial value this unit carries in the off-pool (quarantine) balance, fixed when it entered
        /// quarantine. Whatever takes it out - a return to the supplier, a release into stock, a scrap - moves exactly this value,
        /// so the quarantine balance of every product returns to zero when its quarantine is empty. Nobody types it: it is the
        /// net line price for paid-for defective goods, 0 for excess and unlisted goods, and the entry cost for a damaged
        /// replacement. Kept after the unit leaves quarantine as a record; null for units that were never quarantined.
        /// </summary>
        public decimal? QuarantineCost { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? SoldAt { get; set; }
        public bool IsActive { get; set; }
    }
}
