using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    public class SaleReturn
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public int SaleId { get; set; }
        public DateTime RequestDate { get; set; }
        public ReturnStatusEnum Status { get; set; }
        public string? Description { get; set; }

        /// <summary>Chains successive returns filed on the same sale - pass-through, matches frontend.</summary>
        public int? PreviousReturnId { get; set; }

        /// <summary>
        /// Vestigial pass-through field mirroring the frontend's returnDoc.sourceEffectId (sale side
        /// only). Not consumed anywhere in the frontend either as of this writing - kept for field
        /// parity, no FK since there is nothing yet to point it at.
        /// </summary>
        public int? SourceEffectId { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Sale? Sale { get; set; }
        public SaleReturn? PreviousReturn { get; set; }
        public List<SaleReturnClaim> Claims { get; set; } = new();

        // Roll-ups over the loaded graph. In-memory only (never translatable to SQL) - use them on
        // a materialised entity, not inside an EF projection. Only meaningful once the whole
        // Claims -> Resolutions -> Effects spine has been Included; see IReturnQueryService.
        [NotMapped]
        public int ClaimedQuantity => Claims.Sum(c => c.Quantity);

        [NotMapped]
        public int DecidedQuantity => Claims.Sum(c => c.DecidedQuantity);

        [NotMapped]
        public IEnumerable<SaleReturnEffect> AllEffects => Claims.SelectMany(c => c.Resolutions).SelectMany(r => r.Effects);
    }
}
