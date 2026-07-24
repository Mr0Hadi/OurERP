using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Application.Common.Contracts.Context
{
    public interface IWMSDbContext
    {
        DbSet<User> Users { get; }
        DbSet < Team > Teams { get; }
        DbSet<Supplier> Suppliers { get; }
        DbSet <Sale> Sales { get; }
        DbSet<Purchase> Purchases { get; }
        DbSet <ProductProductCategory> ProductProductCategory { get; }
        DbSet<ProductCategory> ProductCategories { get; }
        DbSet <Product> Products { get; }
        DbSet<Department> Departments { get; }
        DbSet<Customer> Customers { get; }

        DbSet<T> Set<T>() where T : class;

        ChangeTracker ChangeTracker { get; }

        void Dispose();

        Task<int> SaveChangesAsync(CancellationToken cancellationToken);

        int SaveChanges();

        Task<int> ExecuteSqlRawAsync(string sql);
    }
}
