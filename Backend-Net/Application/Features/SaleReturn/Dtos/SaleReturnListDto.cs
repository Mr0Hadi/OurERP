using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    public class SaleReturnListDto
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public DateTime ReturnDate { get; set; }
        public int SaleId { get; set; }
        public string SaleInvoiceNumber { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
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
