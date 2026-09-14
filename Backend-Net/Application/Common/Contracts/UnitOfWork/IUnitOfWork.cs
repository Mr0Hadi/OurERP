namespace Application.Common.Contracts.UnitOfWork
{
    public interface IUnitOfWork : IDisposable
    {
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// Runs <paramref name="work"/> inside one database transaction: every SaveChanges it makes commits together, or - if it
        /// throws - none of them does. For a command that composes several existing commands (each saving on its own) into one
        /// atomic physical event, e.g. one truck carrying order lines and return goods.
        /// </summary>
        Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> work, CancellationToken cancellationToken);
    }
}
