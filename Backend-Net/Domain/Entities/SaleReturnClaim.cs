using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    // One row per (SaleItem, customer-claimed reason) within a SaleReturn - the "budget" that
    // physical inspection (SaleReturnItem rows) is checked against.
    public class SaleReturnClaim
    {
        public int Id { get; set; }
        public int SaleReturnId { get; set; }
        public int SaleItemId { get; set; }
        public int ProductId { get; set; }
        public UInt64 UnitPrice { get; set; }
        public SalesReturnReasonEnum Reason { get; set; }
        public int ClaimedQuantity { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public SaleReturn? SaleReturn { get; set; }
        public SaleItem? SaleItem { get; set; }
        public Product? Product { get; set; }
        public List<SaleReturnItem> InspectionItems { get; set; } = new();

        // In-memory roll-ups over InspectionItems - see the note on SaleReturn.
        [NotMapped]
        public int InspectedQuantity => InspectionItems.Sum(i => i.Quantity);

        /// <summary>How much of the claim has no physical inspection result recorded yet.</summary>
        [NotMapped]
        public int UninspectedQuantity => ClaimedQuantity - InspectedQuantity;

        [NotMapped]
        public int DecidedQuantity => InspectionItems.Sum(i => i.DecidedQuantity);
    }
}
