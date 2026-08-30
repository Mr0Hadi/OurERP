using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    public class PurchaseReturn
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public int PurchaseId { get; set; }
        public DateTime ReturnDate { get; set; }
        public ReturnStatusEnum Status { get; set; }
        public string? Description { get; set; }

        /// <summary>Soft-delete flag. A deleted return keeps its row (and its whole claim graph) and is
        /// filtered out of every read - see IPurchaseReturnQueryService.WhereNotDeleted.</summary>
        public bool IsActive { get; set; } = true;

        /// <summary>Chains successive returns filed on the same purchase - pass-through, matches frontend.</summary>
        public int? PreviousReturnId { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Purchase? Purchase { get; set; }
        public PurchaseReturn? PreviousReturn { get; set; }
        public List<PurchaseReturnClaim> Claims { get; set; } = new();

        /// <summary>
        /// Receiving-session photos captured on the rounds that opened or extended this return.
        /// They belong to the Purchase (see PurchaseReceivingImage) and merely point here, so
        /// deleting the return leaves them intact with a null link.
        /// </summary>
        public List<PurchaseReceivingImage> ReceivingImages { get; set; } = new();

        // Roll-ups over the loaded graph. In-memory only (never translatable to SQL) - use them on
        // a materialised entity, not inside an EF projection. Only meaningful once the whole
        // Claims -> Resolutions -> Effects spine has been Included; see IReturnQueryService.
        [NotMapped]
        public int ClaimedQuantity => Claims.Sum(c => c.Quantity);

        [NotMapped]
        public int DecidedQuantity => Claims.Sum(c => c.DecidedQuantity);

        [NotMapped]
        public IEnumerable<PurchaseReturnEffect> AllEffects => Claims.SelectMany(c => c.Resolutions).SelectMany(r => r.Effects);
    }
}
