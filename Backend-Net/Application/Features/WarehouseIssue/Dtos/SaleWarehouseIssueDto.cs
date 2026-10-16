using Domain.Enums;

namespace Application.Features.WarehouseIssue.Dtos
{
    /// <summary>A unit the warehouse reported during a proforma check, and what accounting decided about it.</summary>
    public class SaleWarehouseIssueDto
    {
        public int Id { get; set; }
        public int SaleId { get; set; }
        public int CustomerId { get; set; }
        public string? CustomerName { get; set; }

        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? ProductCode { get; set; }
        public int ProductUnitId { get; set; }
        public string? Barcode { get; set; }

        /// <summary>Where the unit is now - QUARANTINED until accounting (or a purchase return) moves it.</summary>
        public ProductUnitStatusEnum UnitStatus { get; set; }

        /// <summary>The value it is held at in quarantine; what a scrap books as a loss.</summary>
        public decimal? QuarantineCost { get; set; }

        public UnitActionReasonEnum Reason { get; set; }
        public string? ReasonTitle { get; set; }
        public string Description { get; set; } = string.Empty;
        public int? ReportedByUserId { get; set; }
        public string? ReportedByName { get; set; }
        public DateTime ReportedAt { get; set; }

        public SaleWarehouseIssueResolutionEnum? Resolution { get; set; }
        public string? ResolutionTitle { get; set; }
        public string? ResolutionNote { get; set; }
        public int? ResolvedByUserId { get; set; }
        public string? ResolvedByName { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}
