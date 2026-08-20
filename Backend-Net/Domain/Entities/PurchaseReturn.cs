using Domain.Enums;

namespace Domain.Entities
{
    public class PurchaseReturn
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public int PurchaseId { get; set; }
        public DateTime ReturnDate { get; set; }
        public PurchaseReturnStatusEnum Status { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Purchase? Purchase { get; set; }
        public List<PurchaseReturnItem> Items { get; set; } = new();

        /// <summary>
        /// Receiving-session photos captured on the rounds that opened or extended this return.
        /// They belong to the Purchase (see PurchaseReceivingImage) and merely point here, so
        /// deleting the return leaves them intact with a null link.
        /// </summary>
        public List<PurchaseReceivingImage> ReceivingImages { get; set; } = new();
    }
}
