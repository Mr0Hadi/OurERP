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
        public DbSet<ProductUnitMovement> ProductUnitMovements => Set<ProductUnitMovement>();
        public DbSet<PurchaseReceivingDiscrepancy> PurchaseReceivingDiscrepancies => Set<PurchaseReceivingDiscrepancy>();
        public DbSet<PurchaseReceivingImage> PurchaseReceivingImages => Set<PurchaseReceivingImage>();
        public DbSet<PurchaseDriver> PurchaseDrivers => Set<PurchaseDriver>();
        public DbSet<PurchaseReceivingNote> PurchaseReceivingNotes => Set<PurchaseReceivingNote>();
        public DbSet<DocumentAttachment> DocumentAttachments => Set<DocumentAttachment>();
        public DbSet<SaleDriver> SaleDrivers => Set<SaleDriver>();
        public DbSet<SaleShippingNote> SaleShippingNotes => Set<SaleShippingNote>();
        public DbSet<PosTerminal> PosTerminals => Set<PosTerminal>();
        public DbSet<InventoryCostLedgerEntry> InventoryCostLedgerEntries => Set<InventoryCostLedgerEntry>();
        public DbSet<PaymentDetail> PaymentDetails => Set<PaymentDetail>();
        public DbSet<PartyLedgerEntry> PartyLedgerEntries => Set<PartyLedgerEntry>();
        public DbSet<SaleInstallmentPlan> SaleInstallmentPlans => Set<SaleInstallmentPlan>();
        public DbSet<SaleInstallment> SaleInstallments => Set<SaleInstallment>();
        public DbSet<UserPermission> UserPermissions => Set<UserPermission>();
        public DbSet<DepartmentPermissionTemplate> DepartmentPermissionTemplates => Set<DepartmentPermissionTemplate>();

        public Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken)
        {
            return Database.BeginTransactionAsync(cancellationToken);
        }

        public async Task<int> ExecuteSqlRawAsync(string sql, CancellationToken cancellationToken = default)
        {
            return await this.Database.ExecuteSqlRawAsync(sql, cancellationToken);
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Customer>()
            .Property(x => x.Latitude)
            .HasPrecision(10, 7);

            modelBuilder.Entity<Customer>()
                .Property(x => x.Longitude)
                .HasPrecision(10, 7);

            modelBuilder.Entity<Supplier>()
            .Property(x => x.Latitude)
            .HasPrecision(10, 7);

            modelBuilder.Entity<Supplier>()
                .Property(x => x.Longitude)
                .HasPrecision(10, 7);

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

            modelBuilder.Entity<User>()
                .HasIndex(x => x.PersonelCode)
                .IsUnique();

            // (UserId, Permission) is the whole key - a permission is either granted or it is
            // not, so there is no surrogate id and no way to hold the same one twice.
            modelBuilder.Entity<UserPermission>()
                .HasKey(x => new { x.UserId, x.Permission });

            modelBuilder.Entity<UserPermission>()
                .HasOne(x => x.User)
                .WithMany(x => x.Permissions)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Restrict, not Cascade: two FKs into Users on one table would otherwise give SQL
            // Server multiple cascade paths and it refuses the schema. Deleting the granter must
            // not delete what they granted anyway - users are soft-deleted here regardless.
            modelBuilder.Entity<UserPermission>()
                .HasOne(x => x.GrantedBy)
                .WithMany()
                .HasForeignKey(x => x.GrantedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Same shape as UserPermission: the pair is the key. Cascade is safe here - a template
            // row means nothing without its department, and it is the only FK on the table.
            modelBuilder.Entity<DepartmentPermissionTemplate>()
                .HasKey(x => new { x.DepartmentId, x.Permission });

            modelBuilder.Entity<DepartmentPermissionTemplate>()
                .HasOne(x => x.Department)
                .WithMany(x => x.PermissionTemplate)
                .HasForeignKey(x => x.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);


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

            modelBuilder.Entity<Sale>()
                .HasOne(x => x.SalesUser)
                .WithMany()
                .HasForeignKey(x => x.SalesUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Purchase>()
                .HasOne(x => x.PurchasingUser)
                .WithMany()
                .HasForeignKey(x => x.PurchasingUserId)
                .OnDelete(DeleteBehavior.Restrict);

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
                .Property(x => x.StatusReason)
                .HasMaxLength(500);

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
                .Property(x => x.StatusReason)
                .HasMaxLength(500);

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

            // Same precision as the cost ledger's off-pool column it has to net against to zero.
            modelBuilder.Entity<ProductUnit>()
                .Property(x => x.QuarantineCost)
                .HasPrecision(18, 4);

            // Restrict: the movement ledger is append-only history and must never disappear with its unit.
            // Customer/Supplier/User/document ids are plain columns, not FKs - the ledger records what was true
            // at the time and must not block or cascade from anything that happens to those rows later.
            modelBuilder.Entity<ProductUnitMovement>()
                .HasOne(x => x.ProductUnit)
                .WithMany()
                .HasForeignKey(x => x.ProductUnitId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ProductUnitMovement>()
                .HasIndex(x => new { x.ProductUnitId, x.OccurredAt });

            modelBuilder.Entity<ProductUnitMovement>()
                .HasIndex(x => x.ProductId);

            modelBuilder.Entity<ProductUnitMovement>()
                .HasIndex(x => new { x.DocumentKind, x.DocumentId });

            // The claim quota's one query: quarantined units of a purchase by custody reason.
            modelBuilder.Entity<ProductUnit>()
                .HasIndex(x => new { x.PurchaseId, x.Status, x.CustodyReason });

            // Cascade from the purchase, like PurchaseReceivingImage; Restrict from the product.
            modelBuilder.Entity<PurchaseReceivingDiscrepancy>()
                .HasOne(x => x.Purchase)
                .WithMany()
                .HasForeignKey(x => x.PurchaseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseReceivingDiscrepancy>()
                .HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

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

            modelBuilder.Entity<PurchaseDriver>()
                .HasOne(x => x.Purchase)
                .WithMany(x => x.Drivers)
                .HasForeignKey(x => x.PurchaseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseDriver>()
                .HasIndex(x => x.PurchaseId);

            modelBuilder.Entity<PurchaseReceivingNote>()
                .HasOne(x => x.Purchase)
                .WithMany(x => x.ReceivingNotes)
                .HasForeignKey(x => x.PurchaseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseReceivingNote>()
                .HasIndex(x => x.PurchaseId);

            modelBuilder.Entity<SaleDriver>()
                .HasOne(x => x.Sale)
                .WithMany(x => x.Drivers)
                .HasForeignKey(x => x.SaleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleDriver>()
                .HasIndex(x => x.SaleId);

            modelBuilder.Entity<SaleShippingNote>()
                .HasOne(x => x.Sale)
                .WithMany(x => x.ShippingNotes)
                .HasForeignKey(x => x.SaleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleShippingNote>()
                .HasIndex(x => x.SaleId);

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
                .Property(x => x.OffPoolValueDelta)
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

            modelBuilder.Entity<DocumentAttachment>()
                .HasIndex(x => new { x.DocumentKind, x.DocumentId });

            // هر دو رابطه صریح کانفیگ می‌شوند تا EF از روی Sale.PaymentDetails یک FK سایه‌ای
            // (PurchaseId1) نسازد - همان ناسازگاری‌ای که قبلاً بین Guid PurchaseId و Purchase.Id
            // از نوع int وجود داشت. هر دو FK اختیاری‌اند: یک پرداخت یا به خرید وصل است یا به فروش.
            modelBuilder.Entity<PaymentDetail>()
                .HasOne(x => x.Purchase)
                .WithMany(x => x.PaymentDetails)
                .HasForeignKey(x => x.PurchaseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PaymentDetail>()
                .HasOne(x => x.Sale)
                .WithMany(x => x.PaymentDetails)
                .HasForeignKey(x => x.SaleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PaymentDetail>()
                .HasIndex(x => x.PurchaseId);

            modelBuilder.Entity<PaymentDetail>()
                .HasIndex(x => x.SaleId);

            modelBuilder.Entity<PaymentDetail>()
                .Property(x => x.Amount)
                .HasPrecision(20, 0);

            // Restrict: a supplement line points at the ordered line it grew out of; neither is ever deleted once the
            // invoice is issued, and a cascade here would give SQL Server a second path from Purchases.
            modelBuilder.Entity<PurchaseItem>()
                .HasOne(x => x.SupplementOf)
                .WithMany()
                .HasForeignKey(x => x.SupplementOfPurchaseItemId)
                .OnDelete(DeleteBehavior.Restrict);

            // Party ledger: append-only, so every link is Restrict - nothing it points at is ever hard-deleted while it
            // has rows (returns are referenced by plain claim ids precisely because they can be).
            modelBuilder.Entity<PartyLedgerEntry>(entry =>
            {
                entry.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_PartyLedgerEntries_OneParty",
                        "([CustomerId] IS NOT NULL AND [SupplierId] IS NULL) OR ([CustomerId] IS NULL AND [SupplierId] IS NOT NULL)");
                    t.HasCheckConstraint("CK_PartyLedgerEntries_PositiveAmount", "[Amount] > 0");
                });
                entry.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
                entry.HasOne(x => x.Supplier).WithMany().HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.Restrict);
                entry.HasOne(x => x.Sale).WithMany().HasForeignKey(x => x.SaleId).OnDelete(DeleteBehavior.Restrict);
                entry.HasOne(x => x.Purchase).WithMany().HasForeignKey(x => x.PurchaseId).OnDelete(DeleteBehavior.Restrict);
                entry.HasOne(x => x.PaymentDetail).WithMany().HasForeignKey(x => x.PaymentDetailId).OnDelete(DeleteBehavior.Restrict);
                entry.HasOne(x => x.ReversalOf).WithMany().HasForeignKey(x => x.ReversalOfEntryId).OnDelete(DeleteBehavior.Restrict);
                entry.Property(x => x.Description).HasMaxLength(200);
                entry.HasIndex(x => new { x.CustomerId, x.OccurredAt });
                entry.HasIndex(x => new { x.SupplierId, x.OccurredAt });
            });

            // یک‌به‌یک با فروش.
            modelBuilder.Entity<SaleInstallmentPlan>()
                .HasOne(x => x.Sale)
                .WithOne(x => x.InstallmentPlan)
                .HasForeignKey<SaleInstallmentPlan>(x => x.SaleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SaleInstallmentPlan>()
                .HasIndex(x => x.SaleId)
                .IsUnique();

            modelBuilder.Entity<SaleInstallmentPlan>()
                .Property(x => x.MarkupPercentage)
                .HasPrecision(9, 4);

            modelBuilder.Entity<SaleInstallmentPlan>()
                .Property(x => x.LatePenaltyPercentage)
                .HasPrecision(9, 4);

            modelBuilder.Entity<SaleInstallment>()
                .HasOne(x => x.Plan)
                .WithMany(x => x.Installments)
                .HasForeignKey(x => x.SaleInstallmentPlanId)
                .OnDelete(DeleteBehavior.Cascade);

            // Restrict: PaymentDetail یک رکورد مالی واقعی است و نباید با حذف سطر قسط برود.
            modelBuilder.Entity<SaleInstallment>()
                .HasOne(x => x.PaymentDetail)
                .WithMany()
                .HasForeignKey(x => x.PaymentDetailId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SaleInstallment>()
                .HasIndex(x => new { x.SaleInstallmentPlanId, x.Number })
                .IsUnique();

            modelBuilder.Entity<SaleInstallment>()
                .HasIndex(x => x.DueDate);
        }
    }
}
