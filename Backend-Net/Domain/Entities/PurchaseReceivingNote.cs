namespace Domain.Entities
{
    /// <summary>
    /// A free-text note attached to one receiving event on a purchase (ReceivePurchaseCommand's
    /// ReceivingNote). Kept as its own history list on the Purchase - deliberately not folded into
    /// PurchaseDriver, since a note describes the receiving event itself, not the driver who carried
    /// it out (they're independent: either can be present without the other).
    /// </summary>
    public class PurchaseReceivingNote
    {
        public int Id { get; set; }
        public int PurchaseId { get; set; }
        public string Note { get; set; }
        public DateTime CreatedAt { get; set; }

        public Purchase? Purchase { get; set; }
    }
}
