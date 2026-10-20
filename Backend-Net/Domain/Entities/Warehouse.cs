namespace Domain.Entities
{
    /// <summary>
    /// A place stock is kept (GAP-08). There is always exactly one default warehouse - created by the migration and holding
    /// every unit while the Warehouse.MultiWarehouseEnabled setting is off - so a unit always has a warehouse whatever the
    /// switch says (CLAUDE.md section 6b). Soft delete through IsActive; the default one cannot be deactivated.
    /// </summary>
    public class Warehouse
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Address { get; set; }
        public string? Description { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
