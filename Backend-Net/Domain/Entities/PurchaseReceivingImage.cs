namespace Domain.Entities
{
    /// <summary>
    /// A photo taken while receiving goods from a supplier - evidence for the whole receiving
    /// session (pallet as it arrived, damaged carton, packing slip), not for one line item.
    ///
    /// It hangs off the Purchase rather than off the PurchaseReturn because a receiving session
    /// can be completely clean: if the warehouse reports no discrepancies, ReceivePurchaseCommand
    /// never creates a PurchaseReturn, and the photos still need somewhere to live.
    /// <see cref="PurchaseReturnId"/> links back to the return when that round did open/extend
    /// one, and is nulled (not cascaded) if that return is later deleted - the receiving event
    /// itself still happened.
    /// </summary>
    public class PurchaseReceivingImage
    {
        public int Id { get; set; }
        public int PurchaseId { get; set; }
        public int? PurchaseReturnId { get; set; }

        /// <summary>Object key in the bucket - never a URL, which would expire. See IObjectStorageService.</summary>
        public string ObjectKey { get; set; } = string.Empty;

        public string? FileName { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }

        public Purchase? Purchase { get; set; }
        public PurchaseReturn? PurchaseReturn { get; set; }
    }
}
