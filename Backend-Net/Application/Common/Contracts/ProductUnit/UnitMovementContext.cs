using Domain.Enums;

namespace Application.Common.Contracts.ProductUnit
{
    /// <summary>
    /// What the caller knows about a movement that ProductUnitService does not: why it happened, on which
    /// document, with which counterparty, and when. Every IProductUnitService method takes one, so no unit can
    /// change without a ProductUnitMovement row saying so.
    /// WarehouseId (GAP-08): for units arriving (minted, returned, released) the warehouse they land in - the default one when
    /// null; for units leaving, the warehouse to take them from - any when null. Commands set it only while multi-warehouse is
    /// on (WarehouseScope), so with the switch off everything behaves as one warehouse.
    /// </summary>
    public sealed record UnitMovementContext(
        ProductUnitMovementReasonEnum Reason,
        DateTime OccurredAt,
        DocumentKindEnum? DocumentKind = null,
        int? DocumentId = null,
        int? CustomerId = null,
        int? SupplierId = null,
        string? Note = null,
        UnitActionReasonEnum? ActionReason = null,
        int? WarehouseId = null);
}
