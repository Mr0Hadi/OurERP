using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One change to one physical unit: created, or moved from one status to another. Append-only, never edited
    /// or deleted - ProductUnit keeps only the current state (its SaleItemId is overwritten by the next sale), so
    /// this is the only place a unit's past lives. Written exclusively by ProductUnitService, the only thing that
    /// changes a unit. No IsActive, same as the other event-log rows (PurchaseReceivingImage, PurchaseDriver).
    /// </summary>
    public class ProductUnitMovement
    {
        public int Id { get; set; }

        public int ProductUnitId { get; set; }
        public ProductUnit ProductUnit { get; set; }

        /// <summary>Denormalized from the unit, so a product's movements can be listed without a join.</summary>
        public int ProductId { get; set; }

        /// <summary>Null when the unit was created by this movement.</summary>
        public ProductUnitStatusEnum? FromStatus { get; set; }
        public ProductUnitStatusEnum ToStatus { get; set; }

        public ProductUnitMovementReasonEnum Reason { get; set; }

        /// <summary>The document the movement was recorded on; null for manual adjustments.</summary>
        public DocumentKindEnum? DocumentKind { get; set; }
        public int? DocumentId { get; set; }

        /// <summary>The unit's purchase and sale lines right after the movement - a snapshot, since the unit's own fields change later.</summary>
        public int? PurchaseItemId { get; set; }
        public int? SaleItemId { get; set; }

        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }

        /// <summary>The signed-in user who recorded it, when there is one.</summary>
        public int? UserId { get; set; }

        public string? Note { get; set; }

        /// <summary>When the movement physically happened (the document's date), as opposed to CreatedAt.</summary>
        public DateTime OccurredAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
