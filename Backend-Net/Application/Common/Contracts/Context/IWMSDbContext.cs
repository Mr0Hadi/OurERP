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
        DbSet<Domain.Entities.PurchaseReturn> PurchaseReturns { get; }
        DbSet<PurchaseReturnClaim> PurchaseReturnClaims { get; }
        DbSet<PurchaseReturnResolution> PurchaseReturnResolutions { get; }
        DbSet<PurchaseReturnEffect> PurchaseReturnEffects { get; }
        DbSet<PurchaseReturnEffectRound> PurchaseReturnEffectRounds { get; }
        DbSet<PurchaseReturnEffectObservation> PurchaseReturnEffectObservations { get; }
        DbSet<PurchaseReturnEffectMoneyPart> PurchaseReturnEffectMoneyParts { get; }
        DbSet<Domain.Entities.SaleReturn> SaleReturns { get; }
        DbSet<SaleReturnClaim> SaleReturnClaims { get; }
        DbSet<SaleReturnResolution> SaleReturnResolutions { get; }
        DbSet<SaleReturnEffect> SaleReturnEffects { get; }
        DbSet<SaleReturnEffectRound> SaleReturnEffectRounds { get; }
        DbSet<SaleReturnEffectObservation> SaleReturnEffectObservations { get; }
        DbSet<SaleReturnEffectMoneyPart> SaleReturnEffectMoneyParts { get; }
        DbSet<Domain.Entities.ProductUnit> ProductUnits { get; }
        DbSet<PurchaseReceivingImage> PurchaseReceivingImages { get; }
        DbSet<PurchaseDriver> PurchaseDrivers { get; }
        DbSet<PurchaseReceivingNote> PurchaseReceivingNotes { get; }
        DbSet<DocumentAttachment> DocumentAttachments { get; }
        DbSet<SaleDriver> SaleDrivers { get; }
        DbSet<SaleShippingNote> SaleShippingNotes { get; }
        DbSet<PosTerminal> PosTerminals { get; }
        DbSet<InventoryCostLedgerEntry> InventoryCostLedgerEntries { get; }

        DbSet<T> Set<T>() where T : class;

        ChangeTracker ChangeTracker { get; }

        void Dispose();

        Task<int> SaveChangesAsync(CancellationToken cancellationToken);

        Task<int> ExecuteSqlRawAsync(string sql, CancellationToken cancellationToken = default);
    }
}
