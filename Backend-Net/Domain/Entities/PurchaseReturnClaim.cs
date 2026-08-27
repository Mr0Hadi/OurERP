using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One reported problem line within a PurchaseReturn. PurchaseItemId is null when
    /// Scope == OFF_ORDER (goods claimed outside any ordered line - excess or unlisted).
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

        [NotMapped]
        public int DecidedQuantity => Resolutions.Sum(r => r.Quantity);

        [NotMapped]
        public int RemainingQuantity => Math.Max(0, Quantity - DecidedQuantity);
    }
}
