using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One reported problem line within a PurchaseReturn. PurchaseItemId is set for
    /// Scope == ON_ORDER and for OFF_ORDER/EXCESS (the line the excess is "more of", which prices it),
    /// and null only for OFF_ORDER/UNLISTED (a product the purchase never listed).
    /// </summary>
    public class PurchaseReturnClaim
    {
        public int Id { get; set; }
        public int PurchaseReturnId { get; set; }
        public ReturnClaimScopeEnum Scope { get; set; }
        public ReturnOffScopeKindEnum? OffScopeKind { get; set; }
        public int? PurchaseItemId { get; set; }
        public int ProductId { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Quantity { get; set; }
        public ReturnProblemEnum Problem { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }

        public PurchaseReturn? PurchaseReturn { get; set; }
        public PurchaseItem? PurchaseItem { get; set; }
        public Product? Product { get; set; }
        public List<PurchaseReturnResolution> Resolutions { get; set; } = new();

        /// <summary>
        /// The purchase line this claim counts against - PurchaseItemId for ON_ORDER, null otherwise.
        /// Everything that consumes or settles a line's quota, or scopes units to a line,
        /// must read this rather than PurchaseItemId: an EXCESS claim has a PurchaseItemId too, but
        /// its goods are by definition outside that line.
        /// </summary>
        [NotMapped]
        public int? OnOrderPurchaseItemId => Scope == ReturnClaimScopeEnum.ON_ORDER ? PurchaseItemId : null;

        [NotMapped]
        public int DecidedQuantity => Resolutions.Sum(r => r.Quantity);

        [NotMapped]
        public int RemainingQuantity => Math.Max(0, Quantity - DecidedQuantity);
    }
}
