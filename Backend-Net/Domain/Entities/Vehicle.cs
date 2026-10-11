namespace Domain.Entities
{
    /// <summary>
    /// A vehicle model products fit, e.g. "پراید ۱۱۱". A product links to any number of vehicles through
    /// <see cref="ProductVehicle"/>; a product with no link fits every vehicle ("همه‌ی خودروها").
    /// </summary>
    public class Vehicle
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<ProductVehicle> Products { get; set; } = new();
    }
}
