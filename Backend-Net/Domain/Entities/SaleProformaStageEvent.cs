using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// Append-only history of a proforma's approval pipeline: who approved, at which revision, and every time an edit or a
    /// warehouse shortage sent it back. No IsActive - an event row is never edited or deleted.
    /// </summary>
    public class SaleProformaStageEvent
    {
        public int Id { get; set; }
        public int SaleId { get; set; }
        public Sale Sale { get; set; }
        public SaleProformaEventEnum Kind { get; set; }
        public SaleProformaStageEnum FromStage { get; set; }
        public SaleProformaStageEnum ToStage { get; set; }

        /// <summary>Sale.Revision at the time of the event - what exactly was approved.</summary>
        public int Revision { get; set; }
        public int? UserId { get; set; }

        /// <summary>The shortage per line for WAREHOUSE_SHORTAGE; free text otherwise.</summary>
        public string? Note { get; set; }
        public DateTime OccurredAt { get; set; }
    }
}
