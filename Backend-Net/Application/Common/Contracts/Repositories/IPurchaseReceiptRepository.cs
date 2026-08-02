using Domain.Entities;

namespace Application.Common.Contracts.Repositories
{
    public interface IPurchaseReceiptRepository : IGenericRepository<PurchaseReceipt>
    {
        Task<PurchaseReceipt?> GetWithDetailsAsync(int id);

        Task<PurchaseReceipt?> GetByPurchaseIdAsync(int purchaseId);
    }
}
