using Domain.Enums;

namespace Application.Features.PurchaseReturn.Dtos
{
    /// <summary>One PENDING goods effect awaiting a round - backs the receiving/dispatch queue screen.</summary>
    public class PendingEffectDto
    {
        public int EffectId { get; set; }
        public int PurchaseReturnId { get; set; }
        public string ReturnNumber { get; set; }
        public DateTime ReturnDate { get; set; }
        /// <summary>The purchase the return belongs to - a replacement is received/shipped on that purchase's screen.</summary>
        public int PurchaseId { get; set; }
        public string InvoiceNumber { get; set; }
        public string SupplierName { get; set; }
        public int ClaimId { get; set; }
        public ReturnEffectDirectionEnum Direction { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public int Quantity { get; set; }
        public int AppliedQuantity { get; set; }
        public int RemainingQuantity { get; set; }
    }
}
