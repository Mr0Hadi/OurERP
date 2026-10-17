namespace Domain.Entities
{
    /// <summary>
    /// One stored value of a system setting. The catalogue of settings (key, type, default, limits, Persian title) lives in
    /// code (Application.Common.Settings.SystemSettingCatalog), the PermissionEnum decision again: a setting no code reads
    /// means nothing, so one can never be added from a UI. A missing row means "use the default"; resetting a setting deletes
    /// its row. No IsActive. Changes are recorded by the audit log like any other row.
    /// </summary>
    public class SystemSetting
    {
        /// <summary>The catalogue key, e.g. "Sale.ReservationMinutes". A frontend contract: never rename.</summary>
        public string Key { get; set; } = null!;

        /// <summary>Invariant-culture text of the value; parsed by the catalogue entry's type.</summary>
        public string Value { get; set; } = null!;

        public DateTime UpdatedAt { get; set; }
        public int? UpdatedByUserId { get; set; }
    }
}
