namespace Domain.Entities
{
    /// <summary>
    /// One decision registered against a claim's remaining quantity. Carries its own Quantity/Note
    /// (separate from any individual effect's) but no status of its own - that's inferred from its
    /// Effects (pending if any effect is PENDING). The "composition" the frontend builds in the UI
    /// is expanded into Effects by IReturnCalculationService.ExpandComposition and never persisted
    /// itself.
    /// </summary>
    public class SaleReturnResolution
    {
        public int Id { get; set; }
        public int SaleReturnClaimId { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }

        public SaleReturnClaim? SaleReturnClaim { get; set; }
        public List<SaleReturnEffect> Effects { get; set; } = new();
    }
}
