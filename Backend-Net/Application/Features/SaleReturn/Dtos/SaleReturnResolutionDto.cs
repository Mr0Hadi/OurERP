namespace Application.Features.SaleReturn.Dtos
{
    public class SaleReturnResolutionDto
    {
        public int Id { get; set; }
        public int SaleReturnClaimId { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<SaleReturnEffectDto> Effects { get; set; } = new();
    }
}
