using Domain.Enums;

namespace Domain.Entities
{
    public class PurchaseReturnItem
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public PurchaseIssueTypeEnum IssueType { get; set; }
        public string? Note { get; set; }
        public List<PurchaseReturnDecision> Decisions { get; set; }
        public PurchaseReturn PurchaseReturn { get; set; }
        public int PurchaseReturnId { get; set; }
        public PurchaseItem PurchaseItem { get; set; }
        public int PurchaseItemId { get; set; }
    }
}
