using Domain.Enums;

namespace Domain.Entities
{
    public class PurchaseReturn
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public DateTime ReturnDate { get; set; }
        public PurchaseReturnStatusEnum Status { get; set; }
        public string? Description { get; set; }
        public List<PurchaseReturnItem> Items { get; set; }
        public Purchase Purchase { get; set; }
        public int PurchaseId { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
