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

        /// <summary>
        /// When the unit last entered quarantine, and the document that put it there (null document for a manual warehouse
        /// action). Stamped by ProductUnitService on every move into QUARANTINED and kept after it leaves, like QuarantineCost.
        /// The same fact is in the unit's movement rows; it is copied here because the unit list sorts and filters on it.
        /// </summary>
        public DateTime? QuarantinedAt { get; set; }
        public DocumentKindEnum? QuarantineDocumentKind { get; set; }
        public int? QuarantineDocumentId { get; set; }

        /// <summary>
        /// Label printing (MarkProductUnitsPrinted): how many times this unit's label was printed, and when/by whom first and last.
        /// Not a movement - printing does not change where the unit is. "Unprinted" means IN_STOCK or QUARANTINED with PrintCount 0.
        /// </summary>
        public int PrintCount { get; set; }

        /// <summary>
        /// The shelf the unit sits on, e.g. "A-03-2" - optional free text, stored normalised (upper case, no spaces; see
        /// BinLocations.Normalize) so "a-03-2 " and "A-03-2" are one shelf. Set with SetProductUnitLocation; only meaningful while
        /// the unit is here (IN_STOCK or QUARANTINED), so ProductUnitService clears it whenever the unit leaves. Not a movement:
        /// moving between shelves writes no ProductUnitMovement row.
        /// </summary>
        public string? BinLocation { get; set; }
        public DateTime? FirstPrintedAt { get; set; }
        public DateTime? LastPrintedAt { get; set; }
        public int? LastPrintedByUserId { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? SoldAt { get; set; }
        public bool IsActive { get; set; }
    }
}
