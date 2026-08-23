namespace Application.Common.Contracts.Repositories
{
    public interface IGenericRepository<T> where T : class
    {
        Task<T?> GetByIdAsync(object id, CancellationToken cancellationToken = default);
        Task<IEnumerable<T>> GetAllAsync(CancellationToken cancellationToken = default);
        Task AddAsync(T entity, CancellationToken cancellationToken = default);

        // Update/Remove stage a change on EF's change tracker in memory - they issue no command
        // and touch no connection. The database round-trip happens in IUnitOfWork.SaveChangesAsync,
        // which is async. EF deliberately ships no UpdateAsync/RemoveAsync for the same reason;
        // making these return Task would only add an allocation and a false await.
        void Update(T entity);
        void Remove(T entity);
    }
}
