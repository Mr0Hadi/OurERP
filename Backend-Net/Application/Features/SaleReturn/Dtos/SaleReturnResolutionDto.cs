namespace Application.Features.SaleReturn.Dtos
{
    public class SaleReturnResolutionDto
    {
        public int Id { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
        /// <summary>When this decision was registered (was the CreatedAt audit column).</summary>
        public DateTime DecidedAt { get; set; }
        public bool IsWriteOff { get; set; }
        /// <summary>RemoveClaimResolution would accept it now (ReturnLifecycleRules.ResolutionRemoveBlocker, frontend-requests 14.3).</summary>
        public bool CanRemove { get; set; }
        public List<SaleReturnEffectDto> Effects { get; set; } = new();
    }
}
