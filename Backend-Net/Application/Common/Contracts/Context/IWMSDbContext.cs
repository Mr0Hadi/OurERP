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
        DbSet<ProductCategory> ProductCategories { get; }
        DbSet <Product> Products { get; }
        DbSet<Department> Departments { get; }
        DbSet<Customer> Customers { get; }
        DbSet<Role> Roles { get; }
        DbSet<Domain.Entities.PurchaseReturn> PurchaseReturns { get; }
        DbSet<PurchaseReturnItem> PurchaseReturnItems { get; }
        DbSet<PurchaseReturnDecision> PurchaseReturnDecisions { get; }
        DbSet<Domain.Entities.SaleReturn> SaleReturns { get; }
        DbSet<SaleReturnClaim> SaleReturnClaims { get; }
        DbSet<SaleReturnItem> SaleReturnItems { get; }
        DbSet<SaleReturnDecision> SaleReturnDecisions { get; }
        DbSet<Domain.Entities.ProductUnit> ProductUnits { get; }

        DbSet<T> Set<T>() where T : class;

        ChangeTracker ChangeTracker { get; }

        void Dispose();

        Task<int> SaveChangesAsync(CancellationToken cancellationToken);

        int SaveChanges();

        Task<int> ExecuteSqlRawAsync(string sql);
    }
}
