using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One reported problem line within a SaleReturn. SaleItemId is set for Scope == ON_ORDER and
    /// for OFF_ORDER/EXCESS (the line the excess is "more of", which prices it), and null only for
    /// OFF_ORDER/UNLISTED (a product the sale never listed).
    /// </summary>
    public class SaleReturnClaim
    {
        public int Id { get; set; }
        public int SaleReturnId { get; set; }
        public ReturnClaimScopeEnum Scope { get; set; }
        public ReturnOffScopeKindEnum? OffScopeKind { get; set; }
        public int? SaleItemId { get; set; }
        public int ProductId { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Quantity { get; set; }
        public ReturnProblemEnum Problem { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }

        public SaleReturn? SaleReturn { get; set; }
        public SaleItem? SaleItem { get; set; }
        public Product? Product { get; set; }
        public List<SaleReturnResolution> Resolutions { get; set; } = new();

        /// <summary>
        /// The sale line this claim counts against - SaleItemId for ON_ORDER, null otherwise.
        /// Everything that consumes or settles a line's quota, or scopes units to a line,
        /// must read this rather than SaleItemId: an EXCESS claim has a SaleItemId too, but it has no
        /// SOLD units on that line to restore and must never settle the line's shipped quantity.
        /// </summary>
        [NotMapped]
        public int? OnOrderSaleItemId => Scope == ReturnClaimScopeEnum.ON_ORDER ? SaleItemId : null;

        [NotMapped]
        public int DecidedQuantity => Resolutions.Sum(r => r.Quantity);

        [NotMapped]
        public int RemainingQuantity => Math.Max(0, Quantity - DecidedQuantity);
    }
}
