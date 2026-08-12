namespace Application.Common.Contracts.Repositories
{
    public interface ISaleReturnRepository : IGenericRepository<Domain.Entities.SaleReturn>
    {
        // Unlike purchase (at most one active return per purchase), a sale can have several
        // concurrent active returns - e.g. two different products claimed at different times.
        Task<List<Domain.Entities.SaleReturn>> GetActiveBySaleIdAsync(int saleId, CancellationToken cancellationToken);
    }
}
