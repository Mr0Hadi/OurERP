using Domain.Entities;

namespace Application.Common.Contracts.Repositories
{
    public interface ISaleInstallmentPlanRepository : IGenericRepository<SaleInstallmentPlan>
    {
        /// <summary>
        /// پلن فعال (IsActive و Status در ACTIVE) یک فروش، همراه با سطرهای اقساط.
        /// roll-upهای پلن در حافظه حساب می‌شوند، پس Include کردن Installments الزامی است.
        /// </summary>
        Task<SaleInstallmentPlan?> GetActiveBySaleIdAsync(int saleId, CancellationToken cancellationToken);

        /// <summary>پلن به‌همراه سطرهای اقساط و خودِ فروش - برای handlerهایی که هر دو را می‌نویسند.</summary>
        Task<SaleInstallmentPlan?> GetWithInstallmentsAsync(int planId, CancellationToken cancellationToken);
    }
}
