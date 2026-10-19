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
        public static async Task<long> GetIntegerAsync(IWMSDbContext context, SystemSettingDefinition setting, CancellationToken cancellationToken)
        {
            var stored = await context.SystemSettings.AsNoTracking()
                .Where(x => x.Key == setting.Key)
                .Select(x => x.Value)
                .FirstOrDefaultAsync(cancellationToken);
            var value = stored != null ? setting.Normalize(stored, out _) : null;
            return long.Parse(value ?? setting.DefaultValue, System.Globalization.CultureInfo.InvariantCulture);
        }
    }
}
