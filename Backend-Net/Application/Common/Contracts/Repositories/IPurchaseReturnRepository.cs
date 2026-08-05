namespace Application.Common.Contracts.Repositories
{
    public interface IPurchaseReturnRepository : IGenericRepository<Domain.Entities.PurchaseReturn>
    {
        Task<Domain.Entities.PurchaseReturn?> GetActiveByPurchaseIdAsync(int purchaseId, CancellationToken cancellationToken);
    }
}
