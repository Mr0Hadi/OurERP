using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    /// <summary>One PENDING goods effect awaiting a round - backs the inspection/dispatch queue screen.</summary>
    public class PendingEffectDto
    {
        public int EffectId { get; set; }
        public int SaleReturnId { get; set; }
        public string ReturnNumber { get; set; }
        public DateTime ReturnDate { get; set; }
        /// <summary>The sale the return belongs to - a replacement is received/shipped on that sale's screen.</summary>
        public int SaleId { get; set; }
        public string InvoiceNumber { get; set; }
        public string CustomerName { get; set; }
        public int ClaimId { get; set; }
        public ReturnEffectDirectionEnum Direction { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }

        // What the warehouse needs to identify the product and know whether every unit must be scanned
        // (frontend-requests 15.1). ImageUrl is the GetImage URL of ImageKey, as on ProductDto.
        public bool RequiresUnitTracking { get; set; }
        public string? Brand { get; set; }
        public string? ImageKey { get; set; }
        public string? ImageUrl { get; set; }
        public int Quantity { get; set; }
        public int AppliedQuantity { get; set; }
        public int RemainingQuantity { get; set; }
    }
}
