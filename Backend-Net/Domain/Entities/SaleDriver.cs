namespace Domain.Entities
{
    /// <summary>
    /// The driver/vehicle that carried out one shipping event on a sale (ShipSaleCommand). Mirrors
    /// PurchaseDriver on the outbound side - a sale can ship in several rounds (partial shipments),
    /// each potentially with a different driver, so this is a history list keyed by SaleId.
    /// </summary>
    public class SaleDriver
    {
        public int Id { get; set; }
        public int SaleId { get; set; }
        public string DriverFullName { get; set; }
        public string DriverPhoneNumber { get; set; }
        public string VehiclePlate { get; set; }
        public DateTime CreatedAt { get; set; }

        public Sale? Sale { get; set; }
    }
}
