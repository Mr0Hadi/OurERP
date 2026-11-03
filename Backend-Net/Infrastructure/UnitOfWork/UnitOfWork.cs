using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;

namespace Infrastructure.UnitOfWork
{
    public class UnitOfWork : IUnitOfWork, IDisposable
    {
        private readonly IWMSDbContext _context;

        public UnitOfWork(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
			return await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> work, CancellationToken cancellationToken)
        {
            // Disposing an uncommitted transaction rolls it back, so a throw anywhere in work - or in the deferred checks, which
            // see the final state of every save (the customer credit limit) - leaves the database untouched.
            await using var transaction = await _context.BeginTransactionAsync(cancellationToken);
            try
            {
                var result = await work(cancellationToken);
                await _context.EnsureDeferredChecksAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return result;
            }
            finally
            {
                _context.AbandonDeferredChecks();
            }
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
