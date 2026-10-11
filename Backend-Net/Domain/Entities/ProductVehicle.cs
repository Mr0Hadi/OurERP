namespace Domain.Entities
{
    /// <summary>
    /// Product fits vehicle. Hard-deleted (no IsActive): it is a fact about two rows, not a record with history. Deleting a
    /// vehicle removes its rows, so a link never points at an inactive vehicle.
    /// </summary>
    public class ProductVehicle
    {
        public int ProductId { get; set; }
        public Product Product { get; set; }
        public int VehicleId { get; set; }
        public Vehicle Vehicle { get; set; }
    }
}
