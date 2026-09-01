namespace Domain.Entities
{
    /// <summary>
    /// The driver/vehicle that showed up for one receiving event on a purchase (ReceivePurchaseCommand).
    /// A purchase can be received in several rounds (partial deliveries), each potentially with a
    /// different driver, so this is a history list keyed by PurchaseId - not a single field on Purchase.
    /// </summary>
    public class PurchaseDriver
    {
        public int Id { get; set; }
        public int PurchaseId { get; set; }
        public string DriverFullName { get; set; }
        public string DriverPhoneNumber { get; set; }
        public string VehiclePlate { get; set; }
        public DateTime CreatedAt { get; set; }

        public Purchase? Purchase { get; set; }
    }
}
