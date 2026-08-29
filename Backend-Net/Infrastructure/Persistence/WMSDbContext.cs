using Application.Common.Contracts.Context;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence
{
    public class WMSDbContext : DbContext, IWMSDbContext
    {
        public WMSDbContext(DbContextOptions<WMSDbContext> options)
            :base(options)
        {
            
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Team> Teams => Set<Team>();
        public DbSet<Supplier> Suppliers => Set<Supplier>();
        public DbSet<Sale> Sales => Set<Sale>();
        public DbSet<Purchase> Purchases => Set<Purchase>();
        public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
        public DbSet<Product> Products => Set<Product>();
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<PurchaseItem> PurchaseItems { get; set; }
        public DbSet<SaleItem> SaleItems { get; set; }
        public DbSet<PurchaseReturn> PurchaseReturns => Set<PurchaseReturn>();
        public DbSet<PurchaseReturnClaim> PurchaseReturnClaims => Set<PurchaseReturnClaim>();
        public DbSet<PurchaseReturnResolution> PurchaseReturnResolutions => Set<PurchaseReturnResolution>();
        public DbSet<PurchaseReturnEffect> PurchaseReturnEffects => Set<PurchaseReturnEffect>();
        public DbSet<PurchaseReturnEffectRound> PurchaseReturnEffectRounds => Set<PurchaseReturnEffectRound>();
        public DbSet<PurchaseReturnEffectObservation> PurchaseReturnEffectObservations => Set<PurchaseReturnEffectObservation>();
        public DbSet<PurchaseReturnEffectMoneyPart> PurchaseReturnEffectMoneyParts => Set<PurchaseReturnEffectMoneyPart>();
        public DbSet<SaleReturn> SaleReturns => Set<SaleReturn>();
        public DbSet<SaleReturnClaim> SaleReturnClaims => Set<SaleReturnClaim>();
        public DbSet<SaleReturnResolution> SaleReturnResolutions => Set<SaleReturnResolution>();
        public DbSet<SaleReturnEffect> SaleReturnEffects => Set<SaleReturnEffect>();
        public DbSet<SaleReturnEffectRound> SaleReturnEffectRounds => Set<SaleReturnEffectRound>();
        public DbSet<SaleReturnEffectObservation> SaleReturnEffectObservations => Set<SaleReturnEffectObservation>();
        public DbSet<SaleReturnEffectMoneyPart> SaleReturnEffectMoneyParts => Set<SaleReturnEffectMoneyPart>();
        public DbSet<ProductUnit> ProductUnits => Set<ProductUnit>();
        public DbSet<PurchaseReceivingImage> PurchaseReceivingImages => Set<PurchaseReceivingImage>();
        public DbSet<PosTerminal> PosTerminals => Set<PosTerminal>();
        public DbSet<InventoryCostLedgerEntry> InventoryCostLedgerEntries => Set<InventoryCostLedgerEntry>();

        public async Task<int> ExecuteSqlRawAsync(string sql, CancellationToken cancellationToken = default)
        {
            return await this.Database.ExecuteSqlRawAsync(sql, cancellationToken);
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Department>()
                .HasOne(d => d.Head)
                .WithMany()
                .HasForeignKey(d => d.HeadId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Department>()
                .HasOne(d => d.Deputy)
                .WithMany()
                .HasForeignKey(d => d.DeputyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Department>()
                .HasMany(d => d.Users)
                .WithOne(u => u.Department)
                .HasForeignKey(u => u.DepartmentId);

            modelBuilder.HasSequence<int>("UserPersonelCode")
                .StartsAt(1000)
                .IncrementsBy(1);
            modelBuilder.Entity<User>()
                .Property(x => x.PersonelCode)
            .   HasDefaultValueSql("NEXT VALUE FOR UserPersonelCode");
        

            modelBuilder.Entity<Team>()
                .HasOne(t => t.Head)
                .WithMany()
                .HasForeignKey(t => t.HeadId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Team>()
                .HasOne(t => t.Deputy)
                .WithMany()
                .HasForeignKey(t => t.DeputyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Team>()
                .HasMany(t => t.Users)
                .WithOne(u => u.Team)
                .HasForeignKey(u => u.TeamId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Sale>()
                .HasMany(x => x.Items)
                .WithOne(y => y.Sale)
                .HasForeignKey(x => x.SaleId);

            modelBuilder.Entity<Purchase>()
                .HasMany(x => x.Items)
                .WithOne(x => x.Purchase)
                .HasForeignKey(xx => xx.PurchaseId);

            modelBuilder.Entity<Product>()
                .HasOne(x => x.ProductCategory)
                .WithMany(x => x.Products)
                .HasForeignKey(u => u.ProductCategoryId);

            // Deliberately a separate migration from the ProductUnits table (see
            // docs/product-code-barcode-invoice-design.fa.md 4.3): applying this unique index in
            // the same migration as the ProductUnits table would fail on a DB with pre-existing
            // duplicate/empty Product.Code values. Run EnsureProductCodesCommand between the two.
            modelBuilder.Entity<Product>()
                .HasIndex(x => x.Code)
                .IsUnique();

            modelBuilder.Entity<PurchaseReturn>()
                .HasOne(x => x.Purchase)
                .WithMany()
                .HasForeignKey(x => x.PurchaseId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseReturn>()
                .HasOne(x => x.PreviousReturn)
                .WithMany()
                .HasForeignKey(x => x.PreviousReturnId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseReturnClaim>()
                .HasOne(x => x.PurchaseReturn)
                .WithMany(x => x.Claims)
                .HasForeignKey(x => x.PurchaseReturnId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseReturnClaim>()
                .HasOne(x => x.PurchaseItem)
                .WithMany()
                .HasForeignKey(x => x.PurchaseItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseReturnClaim>()
                .HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseReturnResolution>()
                .HasOne(x => x.PurchaseReturnClaim)
                .WithMany(x => x.Resolutions)
                .HasForeignKey(x => x.PurchaseReturnClaimId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseReturnEffect>()
                .HasOne(x => x.PurchaseReturnResolution)
                .WithMany(x => x.Effects)
                .HasForeignKey(x => x.PurchaseReturnResolutionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseReturnEffect>()
                .HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseReturnEffectRound>()
                .HasOne(x => x.PurchaseReturnEffect)
                .WithMany(x => x.History)
                .HasForeignKey(x => x.PurchaseReturnEffectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseReturnEffectObservation>()
                .HasOne(x => x.PurchaseReturnEffectRound)
                .WithMany(x => x.Observations)
                .HasForeignKey(x => x.PurchaseReturnEffectRoundId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseReturnEffectMoneyPart>()
                .HasOne(x => x.PurchaseReturnEffect)
                .WithMany(x => x.MoneyParts)
                .HasForeignKey(x => x.PurchaseReturnEffectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleReturn>()
                .HasOne(x => x.Sale)
                .WithMany()
                .HasForeignKey(x => x.SaleId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SaleReturn>()
                .HasOne(x => x.PreviousReturn)
                .WithMany()
                .HasForeignKey(x => x.PreviousReturnId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SaleReturnClaim>()
                .HasOne(x => x.SaleReturn)
                .WithMany(x => x.Claims)
                .HasForeignKey(x => x.SaleReturnId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleReturnClaim>()
                .HasOne(x => x.SaleItem)
                .WithMany()
                .HasForeignKey(x => x.SaleItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SaleReturnClaim>()
                .HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SaleReturnResolution>()
                .HasOne(x => x.SaleReturnClaim)
                .WithMany(x => x.Resolutions)
                .HasForeignKey(x => x.SaleReturnClaimId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleReturnEffect>()
                .HasOne(x => x.SaleReturnResolution)
                .WithMany(x => x.Effects)
                .HasForeignKey(x => x.SaleReturnResolutionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleReturnEffect>()
                .HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SaleReturnEffectRound>()
                .HasOne(x => x.SaleReturnEffect)
                .WithMany(x => x.History)
                .HasForeignKey(x => x.SaleReturnEffectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleReturnEffectObservation>()
                .HasOne(x => x.SaleReturnEffectRound)
                .WithMany(x => x.Observations)
                .HasForeignKey(x => x.SaleReturnEffectRoundId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleReturnEffectMoneyPart>()
                .HasOne(x => x.SaleReturnEffect)
                .WithMany(x => x.MoneyParts)
                .HasForeignKey(x => x.SaleReturnEffectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProductUnit>()
                .HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ProductUnit>()
                .HasIndex(x => x.BarcodePayload)
                .IsUnique();

            modelBuilder.Entity<ProductUnit>()
                .HasIndex(x => new { x.ProductId, x.SerialNumber })
                .IsUnique();

            modelBuilder.Entity<ProductUnit>()
                .HasIndex(x => x.SaleItemId);

            modelBuilder.Entity<ProductUnit>()
                .HasIndex(x => x.PurchaseItemId);

            modelBuilder.Entity<PurchaseReceivingImage>()
                .HasOne(x => x.Purchase)
                .WithMany()
                .HasForeignKey(x => x.PurchaseId)
                .OnDelete(DeleteBehavior.Cascade);

            // SetNull, not Cascade: DeletePurchaseReturnCommand hard-deletes a PENDING return, but
            // the photos document a receiving event that still happened and stay on the purchase.
            modelBuilder.Entity<PurchaseReceivingImage>()
                .HasOne(x => x.PurchaseReturn)
                .WithMany(x => x.ReceivingImages)
                .HasForeignKey(x => x.PurchaseReturnId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<PurchaseReceivingImage>()
                .HasIndex(x => x.PurchaseId);

            modelBuilder.Entity<PosTerminal>()
                .HasIndex(x => x.Name)
                .IsUnique();

            // Unique index on Product.Code is added in a later migration
            // (see 20260813xxxxxx_product-code-unique-index) after EnsureProductCodes
            // has had a chance to backfill/de-duplicate existing rows - adding it here
            // would fail the migration against a DB with pre-existing blank/duplicate codes.

            // Money elsewhere in this project is UInt64/decimal(20,0), but a weighted average
            // needs fractional precision to avoid compounding rounding drift across many
            // chronological entries - a deliberate deviation for this one table.
            modelBuilder.Entity<InventoryCostLedgerEntry>()
                .Property(x => x.UnitCost)
                .HasPrecision(18, 4);

            modelBuilder.Entity<InventoryCostLedgerEntry>()
                .Property(x => x.InventoryValueDelta)
                .HasPrecision(18, 4);

            modelBuilder.Entity<InventoryCostLedgerEntry>()
                .Property(x => x.RunningInventoryValue)
                .HasPrecision(18, 4);

            modelBuilder.Entity<InventoryCostLedgerEntry>()
                .Property(x => x.RunningAverageCost)
                .HasPrecision(18, 4);

            modelBuilder.Entity<InventoryCostLedgerEntry>()
                .Property(x => x.RevenueDelta)
                .HasPrecision(18, 4);

            modelBuilder.Entity<InventoryCostLedgerEntry>()
                .HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<InventoryCostLedgerEntry>()
                .HasIndex(x => new { x.ProductId, x.Id });

            modelBuilder.Entity<InventoryCostLedgerEntry>()
                .HasIndex(x => new { x.ReferenceType, x.ReferenceId });
        }
    }
}
