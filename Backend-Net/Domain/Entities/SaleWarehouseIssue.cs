using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// A unit the warehouse found damaged, defective, expired or missing while checking a proforma. The unit itself went to
    /// quarantine (custody WAREHOUSE_HOLD) at that moment; this row is the strict record of who reported what, and the
    /// accounting decision taken on it afterwards. It never holds the proforma back - a healthy replacement is scanned
    /// instead, or the proforma goes back to the customer as a shortage.
    /// </summary>
    public class SaleWarehouseIssue
    {
        public int Id { get; set; }
        public int SaleId { get; set; }
        public Sale Sale { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }
        public int ProductUnitId { get; set; }
        public ProductUnit ProductUnit { get; set; }

        public UnitActionReasonEnum Reason { get; set; }
        public string Description { get; set; } = string.Empty;
        public int? ReportedByUserId { get; set; }
        public DateTime ReportedAt { get; set; }

        /// <summary>Null while accounting has not decided.</summary>
        public SaleWarehouseIssueResolutionEnum? Resolution { get; set; }
        public string? ResolutionNote { get; set; }
        public int? ResolvedByUserId { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}
