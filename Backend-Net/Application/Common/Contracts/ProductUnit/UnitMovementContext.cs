using Domain.Enums;

namespace Application.Common.Contracts.ProductUnit
{
    /// <summary>
    /// What the caller knows about a movement that ProductUnitService does not: why it happened, on which
    /// document, with which counterparty, and when. Every IProductUnitService method takes one, so no unit can
    /// change without a ProductUnitMovement row saying so.
    /// </summary>
    public sealed record UnitMovementContext(
        ProductUnitMovementReasonEnum Reason,
        DateTime OccurredAt,
        DocumentKindEnum? DocumentKind = null,
        int? DocumentId = null,
        int? CustomerId = null,
        int? SupplierId = null,
        string? Note = null);
}
