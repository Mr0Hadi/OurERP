using Application.Common.Contracts.Context;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Settings
{
    /// <summary>
    /// Uncached reads of a setting, for static readers that only have the context (SaleInstallmentPlanReader). Commands go
    /// through ISystemSettingService. Same rule: no row, or a value outside the catalogue's limits, reads as the default.
    /// </summary>
    public static class SystemSettingValues
    {
        public static async Task<long> GetIntegerAsync(IWMSDbContext context, SystemSettingDefinition setting, CancellationToken cancellationToken) =>
            long.Parse(await GetTextAsync(context, setting, cancellationToken), System.Globalization.CultureInfo.InvariantCulture);

        public static async Task<bool> GetBooleanAsync(IWMSDbContext context, SystemSettingDefinition setting, CancellationToken cancellationToken) =>
            bool.Parse(await GetTextAsync(context, setting, cancellationToken));

        public static async Task<string> GetTextAsync(IWMSDbContext context, SystemSettingDefinition setting, CancellationToken cancellationToken)
        {
            var stored = await context.SystemSettings.AsNoTracking()
                .Where(x => x.Key == setting.Key)
                .Select(x => x.Value)
                .FirstOrDefaultAsync(cancellationToken);
            return (stored != null ? setting.Normalize(stored, out _) : null) ?? setting.DefaultValue;
        }

        /// <summary>The company letterhead for printed documents - the COMPANY group of the settings page.</summary>
        public static async Task<Contracts.Documents.CompanyInfo> CompanyAsync(IWMSDbContext context, CancellationToken cancellationToken)
        {
            var keys = SystemSettingCatalog.All.Where(x => x.Group == Domain.Enums.SystemSettingGroupEnum.COMPANY).Select(x => x.Key).ToList();
            var stored = await context.SystemSettings.AsNoTracking()
                .Where(x => keys.Contains(x.Key))
                .ToDictionaryAsync(x => x.Key, x => x.Value, StringComparer.OrdinalIgnoreCase, cancellationToken);

            string? Get(SystemSettingDefinition d)
            {
                var value = stored.TryGetValue(d.Key, out var v) ? d.Normalize(v, out _) : null;
                value ??= d.DefaultValue;
                return string.IsNullOrWhiteSpace(value) ? null : value;
            }

            return new Contracts.Documents.CompanyInfo
            {
                Name = Get(SystemSettingCatalog.CompanyName) ?? string.Empty,
                NationalId = Get(SystemSettingCatalog.CompanyNationalId),
                EconomicCode = Get(SystemSettingCatalog.CompanyEconomicCode),
                RegistrationNumber = Get(SystemSettingCatalog.CompanyRegistrationNumber),
                Address = Get(SystemSettingCatalog.CompanyAddress),
                PhoneNumber = Get(SystemSettingCatalog.CompanyPhoneNumber),
                PostalCode = Get(SystemSettingCatalog.CompanyPostalCode),
                Province = Get(SystemSettingCatalog.CompanyProvince),
                City = Get(SystemSettingCatalog.CompanyCity),
                Currency = Get(SystemSettingCatalog.CompanyCurrency) ?? "ریال",
            };
        }
    }
}
