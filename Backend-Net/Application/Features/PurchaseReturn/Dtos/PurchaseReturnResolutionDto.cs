namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReturnResolutionDto
    {
        public int Id { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
        /// <summary>When this decision was registered (was the CreatedAt audit column).</summary>
        public DateTime DecidedAt { get; set; }
        public List<PurchaseReturnEffectDto> Effects { get; set; } = new();
    }
}
