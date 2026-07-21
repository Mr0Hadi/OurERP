using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Application.Common.Contracts.Context
{
    public interface IWMSDbContext
    {
        DbSet<T> Set<T>() where T : class;

        ChangeTracker ChangeTracker { get; }

        void Dispose();

        Task<int> SaveChangesAsync(CancellationToken cancellationToken);

        int SaveChanges();

        Task<int> ExecuteSqlRawAsync(string sql);
    }
}
