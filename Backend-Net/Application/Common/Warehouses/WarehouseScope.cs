using Application.Common.Contracts.Context;
using Application.Common.Settings;
using Common.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Warehouses
{
    /// <summary>
    /// The one place a command asks "does the warehouse the request named count?" (GAP-08). While the
    /// Warehouse.MultiWarehouseEnabled setting is off, a warehouse on a request is ignored - new units go to the default
    /// warehouse, units leave from any - so a client that still sends one cannot split stock the company has switched off.
    /// While on, a named warehouse must exist and be active. CLAUDE.md section 6b.
    /// </summary>
    public static class WarehouseScope
    {
        public static Task<bool> IsEnabledAsync(IWMSDbContext context, CancellationToken cancellationToken) =>
            SystemSettingValues.GetBooleanAsync(context, SystemSettingCatalog.WarehouseMultiWarehouseEnabled, cancellationToken);

        /// <summary>The warehouse to put on the movement: null (= default / any) while off or when none was named.</summary>
        public static async Task<int?> ResolveAsync(IWMSDbContext context, int? requestedWarehouseId, CancellationToken cancellationToken)
        {
            if (requestedWarehouseId == null || !await IsEnabledAsync(context, cancellationToken))
                return null;

            if (!await context.Warehouses.AnyAsync(x => x.Id == requestedWarehouseId && x.IsActive, cancellationToken))
                throw new ValidationCustomException("انبار انتخاب‌شده یافت نشد یا غیرفعال است.");
            return requestedWarehouseId;
        }

        /// <summary>For operations that only exist with several warehouses (a new stock transfer): refused while off.</summary>
        public static async Task EnsureEnabledAsync(IWMSDbContext context, CancellationToken cancellationToken)
        {
            if (!await IsEnabledAsync(context, cancellationToken))
                throw new ValidationCustomException("قابلیت چند انبار در تنظیمات سامانه خاموش است.");
        }
    }
}
