namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReturnResolutionDto
    {
        public int Id { get; set; }
        public int PurchaseReturnClaimId { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<PurchaseReturnEffectDto> Effects { get; set; } = new();
    }
}
