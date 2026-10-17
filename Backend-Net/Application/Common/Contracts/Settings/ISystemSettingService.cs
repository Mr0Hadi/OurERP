using Application.Common.Settings;

namespace Application.Common.Contracts.Settings
{
    /// <summary>
    /// Typed, cached reads of the system settings. A setting with no stored row reads as its catalogue default. The cache is
    /// dropped by <see cref="Invalidate"/>, which UpdateSystemSettings calls; a short expiry covers a row changed in SQL by hand.
    /// </summary>
    public interface ISystemSettingService
    {
        Task<long> GetIntegerAsync(SystemSettingDefinition setting, CancellationToken cancellationToken = default);
        Task<bool> GetBooleanAsync(SystemSettingDefinition setting, CancellationToken cancellationToken = default);
        Task<string> GetTextAsync(SystemSettingDefinition setting, CancellationToken cancellationToken = default);
        void Invalidate();
    }
}
