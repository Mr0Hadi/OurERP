using Application.Common.Contracts.Context;
using Application.Features.SaleInstallment.Dtos;
using Common.Extensions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleInstallment.Mappings
{
    /// <summary>
    /// خلاصه‌ی قرارداد اقساطی برای صفحه‌های فروش. در یک round-trip برای کل صفحه‌ی لیست لود
    /// می‌شود و roll-upها در حافظه حساب می‌شوند - همان الگوی امضای URL تصاویر که بعد از
    /// <c>ToPagedAsync</c> انجام می‌شود، چون این محاسبه‌ها به SQL ترجمه نمی‌شوند.
    /// </summary>
    public static class SaleInstallmentSummaryReader
    {
        public static async Task<Dictionary<int, SaleInstallmentSummaryDto>> ReadForSalesAsync(
            IWMSDbContext context, IReadOnlyCollection<int> saleIds, CancellationToken cancellationToken)
        {
            if (saleIds.Count == 0)
                return new Dictionary<int, SaleInstallmentSummaryDto>();

            var plans = await context.SaleInstallmentPlans.AsNoTracking()
                .Include(x => x.Installments)
                .Where(x => saleIds.Contains(x.SaleId))
                .ToListAsync(cancellationToken);

            return plans
                // اگر روی یک فروش هم پلن ابطال‌شده باشد و هم پلن جدید، پلن جاری اولویت دارد.
                .GroupBy(x => x.SaleId)
                .Select(group => group
                    .OrderByDescending(x => x.IsActive && x.Status == SaleInstallmentPlanStatusEnum.ACTIVE)
                    .ThenByDescending(x => x.Id)
                    .First())
                .ToDictionary(plan => plan.SaleId, plan => new SaleInstallmentSummaryDto
                {
                    PlanId = plan.Id,
                    TotalAmount = plan.TotalAmount,
                    DownPaymentAmount = plan.DownPaymentAmount,
                    InstallmentCount = plan.InstallmentCount,
                    PaidInstallmentCount = plan.PaidInstallmentCount,
                    LastPaymentDate = plan.LastPaymentDate,
                    NextDueDate = plan.NextDueDate,
                    PaidAmount = plan.PaidAmount,
                    RemainingAmount = plan.RemainingAmount,
                    Status = plan.Status,
                    StatusTitle = plan.Status.GetDescription(),
                });
        }

        public static async Task<SaleInstallmentSummaryDto?> ReadForSaleAsync(
            IWMSDbContext context, int saleId, CancellationToken cancellationToken)
        {
            var summaries = await ReadForSalesAsync(context, new[] { saleId }, cancellationToken);

            return summaries.TryGetValue(saleId, out var summary) ? summary : null;
        }
    }
}
