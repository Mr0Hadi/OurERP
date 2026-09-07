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
        /// <summary>Set when this return follows on from an earlier one on the same document.</summary>
        public int? PreviousReturnId { get; set; }
        public ReturnStatusEnum Status { get; set; }
        /// <summary>Every distinct problem reported on this return, most-claimed first.
        /// Replaces DominantProblem, which showed only the largest claim's problem - and
        /// reported enum value 0 as a real problem for a return with no claims.</summary>
        public List<ReturnProblemEnum> Problems { get; set; } = new();
        public int TotalQuantity { get; set; }
        public UInt64 TotalAmount { get; set; }
    }
}
