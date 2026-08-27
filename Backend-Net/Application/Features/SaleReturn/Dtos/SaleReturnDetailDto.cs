using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    public class SaleReturnDetailDto
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public DateTime RequestDate { get; set; }
        public int SaleId { get; set; }
        public string SaleInvoiceNumber { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string? Description { get; set; }
        public int? PreviousReturnId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public ReturnStatusEnum Status { get; set; }
        public UInt64 TotalAmount { get; set; }
        public int TotalQuantity { get; set; }
        public int DecidedQuantity { get; set; }
        public bool CanDelete { get; set; }
        public bool CanCancel { get; set; }
        public bool CanReject { get; set; }
        public bool CanReopen { get; set; }
        public List<SaleReturnClaimDto> Claims { get; set; } = new();
    }
}
