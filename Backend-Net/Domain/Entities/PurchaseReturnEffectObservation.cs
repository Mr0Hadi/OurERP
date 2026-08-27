using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One physically-observed problem within a GOODS_IN round - kept independent of the claim's
    /// own Problem so "claimed reason" and "what was actually observed on arrival" both survive.
    /// </summary>
    public class PurchaseReturnEffectObservation
    {
        public int Id { get; set; }
        public int PurchaseReturnEffectRoundId { get; set; }
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }

        public PurchaseReturnEffectRound? PurchaseReturnEffectRound { get; set; }
    }
}
