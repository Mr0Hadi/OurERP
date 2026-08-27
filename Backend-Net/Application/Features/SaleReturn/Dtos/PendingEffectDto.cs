using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    /// <summary>One PENDING goods effect awaiting a round - backs the inspection/dispatch queue screen.</summary>
    public class PendingEffectDto
    {
        public int EffectId { get; set; }
        public int SaleReturnId { get; set; }
        public string ReturnNumber { get; set; }
        public int ClaimId { get; set; }
        public ReturnEffectKindEnum Kind { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public int Quantity { get; set; }
        public int DoneQuantity { get; set; }
        public int RemainingQuantity { get; set; }
    }
}
