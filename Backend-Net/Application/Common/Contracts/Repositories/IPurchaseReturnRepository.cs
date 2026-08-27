namespace Application.Common.Contracts.Repositories
{
    public interface IPurchaseReturnRepository : IGenericRepository<Domain.Entities.PurchaseReturn>
    {
        // Several concurrent active returns per purchase are allowed - purchase returns are now
        // created explicitly (CreatePurchaseReturnCommand), same as sale returns, so there is no
        // longer a single implicitly-reused return to look up.
        Task<List<Domain.Entities.PurchaseReturn>> GetActiveByPurchaseIdAsync(int purchaseId, CancellationToken cancellationToken);
    }
}
