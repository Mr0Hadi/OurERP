using Domain.Enums;

namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReturnListDto
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public DateTime ReturnDate { get; set; }
        public int PurchaseId { get; set; }
        public string PurchaseInvoiceNumber { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; }
        public DateTime CreatedAt { get; set; }
        public ReturnStatusEnum Status { get; set; }
        public ReturnProblemEnum DominantProblem { get; set; }
        public int TotalQuantity { get; set; }
        public UInt64 TotalAmount { get; set; }
    }
}
