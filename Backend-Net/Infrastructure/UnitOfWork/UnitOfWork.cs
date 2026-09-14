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
            // Disposing an uncommitted transaction rolls it back, so a throw anywhere in work leaves the database untouched.
            await using var transaction = await _context.BeginTransactionAsync(cancellationToken);
            var result = await work(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return result;
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
