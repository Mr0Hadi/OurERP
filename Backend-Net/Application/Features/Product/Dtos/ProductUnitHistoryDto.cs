using Domain.Enums;

namespace Application.Features.Product.Dtos
{
    public class ProductUnitHistoryDto
    {
        public ProductUnitDto Unit { get; set; }

        /// <summary>Every movement of the unit, oldest first.</summary>
        public List<ProductUnitMovementDto> Movements { get; set; } = new();
    }

    public class ProductUnitMovementDto
    {
        public int Id { get; set; }
        public DateTime OccurredAt { get; set; }

        /// <summary>Null on the movement that created the unit.</summary>
        public ProductUnitStatusEnum? FromStatus { get; set; }
        public ProductUnitStatusEnum ToStatus { get; set; }
        public ProductUnitMovementReasonEnum Reason { get; set; }
        public string ReasonTitle { get; set; }
        public DocumentKindEnum? DocumentKind { get; set; }
        public int? DocumentId { get; set; }

        /// <summary>The document's invoice or return number.</summary>
        public string? DocumentNumber { get; set; }
        public int? PurchaseItemId { get; set; }
        public int? SaleItemId { get; set; }
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public int? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public int? UserId { get; set; }
        public string? UserName { get; set; }
        public string? Note { get; set; }
    }
}
