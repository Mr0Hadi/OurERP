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
        public DbSet<Role> Roles => Set<Role>();
        public DbSet<PurchaseItem> PurchaseItems { get; set; }
        public DbSet<SaleItem> SaleItems { get; set; }
        public DbSet<PurchaseReturn> PurchaseReturns => Set<PurchaseReturn>();
        public DbSet<PurchaseReturnItem> PurchaseReturnItems => Set<PurchaseReturnItem>();
        public DbSet<PurchaseReturnDecision> PurchaseReturnDecisions => Set<PurchaseReturnDecision>();
        public DbSet<SaleReturn> SaleReturns => Set<SaleReturn>();
        public DbSet<SaleReturnClaim> SaleReturnClaims => Set<SaleReturnClaim>();
        public DbSet<SaleReturnItem> SaleReturnItems => Set<SaleReturnItem>();
        public DbSet<SaleReturnDecision> SaleReturnDecisions => Set<SaleReturnDecision>();
        public DbSet<ProductUnit> ProductUnits => Set<ProductUnit>();
        public DbSet<PurchaseReceivingImage> PurchaseReceivingImages => Set<PurchaseReceivingImage>();

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
                .HasMany(d => d.Users)
                .WithOne(u => u.Department)
                .HasForeignKey(u => u.DepartmentId);

            modelBuilder.Entity<Team>()
                .HasOne(t => t.Head)
                .WithMany()
                .HasForeignKey(t => t.HeadId)
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

            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId);

            modelBuilder.Entity<PurchaseReturn>()
                .HasOne(x => x.Purchase)
                .WithMany()
                .HasForeignKey(x => x.PurchaseId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseReturnItem>()
                .HasOne(x => x.PurchaseReturn)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.PurchaseReturnId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseReturnItem>()
                .HasOne(x => x.PurchaseItem)
                .WithMany()
                .HasForeignKey(x => x.PurchaseItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseReturnItem>()
                .HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseReturnDecision>()
                .HasOne(x => x.PurchaseReturnItem)
                .WithMany(x => x.Decisions)
                .HasForeignKey(x => x.PurchaseReturnItemId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleReturn>()
                .HasOne(x => x.Sale)
                .WithMany()
                .HasForeignKey(x => x.SaleId)
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

            modelBuilder.Entity<SaleReturnItem>()
                .HasOne(x => x.SaleReturnClaim)
                .WithMany(x => x.InspectionItems)
                .HasForeignKey(x => x.SaleReturnClaimId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleReturnDecision>()
                .HasOne(x => x.SaleReturnItem)
                .WithMany(x => x.Decisions)
                .HasForeignKey(x => x.SaleReturnItemId)
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

            // Unique index on Product.Code is added in a later migration
            // (see 20260813xxxxxx_product-code-unique-index) after EnsureProductCodes
            // has had a chance to backfill/de-duplicate existing rows - adding it here
            // would fail the migration against a DB with pre-existing blank/duplicate codes.
        }
    }
}
