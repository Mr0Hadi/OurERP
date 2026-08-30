namespace Domain.Entities
{
    /// <summary>
    /// A free-text note attached to one shipping event on a sale (ShipSaleCommand's ShippingNote).
    /// Mirrors PurchaseReceivingNote on the outbound side - kept independent from SaleDriver for the
    /// same reason: the note describes the shipping event, not the driver.
    /// </summary>
    public class SaleShippingNote
    {
        public int Id { get; set; }
        public int SaleId { get; set; }
        public string Note { get; set; }
        public DateTime CreatedAt { get; set; }

        public Sale? Sale { get; set; }
    }
}
