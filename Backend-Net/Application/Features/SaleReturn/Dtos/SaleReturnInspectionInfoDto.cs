using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    // Backs the warehouse inspection queue for a sale's active returns - the sale-side
    // counterpart of PurchaseReceivingInfoDto.
    public class SaleReturnInspectionInfoDto
    {
        public int SaleId { get; set; }
        public string InvoiceNumber { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public List<SaleReturnInspectionClaimInfoDto> Claims { get; set; } = new();
    }

    public class SaleReturnInspectionClaimInfoDto
    {
        public int SaleReturnId { get; set; }
        public string ReturnNumber { get; set; }
        public int SaleReturnClaimId { get; set; }
        public int SaleItemId { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public SalesReturnReasonEnum Reason { get; set; }
        public int ClaimedQuantity { get; set; }
        public int InspectedQuantity { get; set; }
        public int UninspectedQuantity { get; set; }
        public List<SaleReturnInspectionResultInfoDto> ExistingResults { get; set; } = new();
    }

    public class SaleReturnInspectionResultInfoDto
    {
        public int SaleReturnItemId { get; set; }
        public SalesReturnIssueTypeEnum? IssueType { get; set; }
        public int Quantity { get; set; }
        public int DecidedQuantity { get; set; }
    }
}
