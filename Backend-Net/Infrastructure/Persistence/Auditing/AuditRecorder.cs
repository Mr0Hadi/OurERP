using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Json;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Infrastructure.Persistence.Auditing
{
    /// <summary>
    /// Turns the change tracker of one SaveChanges into <see cref="AuditEntityChange"/> rows. Used only by
    /// WMSDbContext.SaveChangesAsync, in three steps around the real save:
    /// <list type="number">
    /// <item><see cref="Capture"/> before the save: which rows change, and the old/new values of updates and deletes
    /// (after the save the original values are gone).</item>
    /// <item><see cref="BeforeSaveAsync"/>: key and document of deleted rows, while their parents are still there.</item>
    /// <item><see cref="AfterSaveAsync"/>: key, document and values of inserted rows, which only now have their real
    /// ids and database defaults, and the key and document of updated rows.</item>
    /// </list>
    /// Generic on purpose: every entity is recorded unless listed in <see cref="NotAudited"/>, so a new table is covered
    /// without anyone remembering to add it.
    /// </summary>
    internal sealed class AuditRecorder
    {
        /// <summary>
        /// Tables that are already history - append-only ledgers that record who/when/what themselves - and the audit
        /// tables. Recording them again would only double the data.
        /// </summary>
        private static readonly HashSet<Type> NotAudited = new()
        {
            typeof(AuditEvent),
            typeof(AuditEntityChange),
            typeof(PartyLedgerEntry),
            typeof(InventoryCostLedgerEntry),
            typeof(ProductUnitMovement),
        };

        /// <summary>
        /// Columns left out entirely: session bookkeeping that changes on every login/refresh. Recording it would put a
        /// secret in the log and an event in the table every few minutes per user.
        /// </summary>
        private static readonly Dictionary<Type, HashSet<string>> Ignored = new()
        {
            [typeof(User)] = new() { nameof(User.RefreshToken), nameof(User.ExpireRefreshToken) },
        };

        /// <summary>Columns whose change is recorded but whose value never is.</summary>
        private static readonly Dictionary<Type, HashSet<string>> Redacted = new()
        {
            [typeof(User)] = new() { nameof(User.PasswordHash) },
        };

        private const string RedactedValue = "***";

        // Persian text stays readable in the column instead of becoming \uXXXX escapes.
        private static readonly JsonSerializerOptions Json = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

        private readonly DbContext _context;
        private readonly List<Pending> _pending;

        private AuditRecorder(DbContext context, List<Pending> pending)
        {
            _context = context;
            _pending = pending;
        }

        /// <summary>Null when this save changes nothing worth recording.</summary>
        public static AuditRecorder? Capture(DbContext context)
        {
            var pending = new List<Pending>();

            foreach (var entry in context.ChangeTracker.Entries())
            {
                if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted))
                    continue;

                var type = entry.Metadata.ClrType;
                if (NotAudited.Contains(type))
                    continue;

                switch (entry.State)
                {
                    case EntityState.Added:
                        pending.Add(new Pending(entry, AuditOperationEnum.INSERT));
                        break;

                    case EntityState.Deleted:
                        pending.Add(new Pending(entry, AuditOperationEnum.DELETE) { Old = Snapshot(entry, original: true) });
                        break;

                    case EntityState.Modified:
                        var old = new Dictionary<string, object?>();
                        var @new = new Dictionary<string, object?>();
                        foreach (var property in entry.Properties)
                        {
                            var name = property.Metadata.Name;
                            if (IsIgnored(type, name) || Equals(property.OriginalValue, property.CurrentValue))
                                continue;

                            // Update() on a tracked entity flags every column modified; only real differences count.
                            var redacted = IsRedacted(type, name);
                            old[name] = redacted ? RedactedValue : property.OriginalValue;
                            @new[name] = redacted ? RedactedValue : property.CurrentValue;
                        }

                        if (@new.Count > 0)
                            pending.Add(new Pending(entry, AuditOperationEnum.UPDATE) { Old = old, New = @new });
                        break;
                }
            }

            return pending.Count == 0 ? null : new AuditRecorder(context, pending);
        }

        public async Task BeforeSaveAsync(CancellationToken cancellationToken)
        {
            foreach (var item in _pending.Where(x => x.Operation == AuditOperationEnum.DELETE))
            {
                item.Key = KeyOf(item.Entry);
                item.Document = await DocumentOfAsync(item.Entry.Entity, cancellationToken);
            }
        }

        public async Task<List<AuditEntityChange>> AfterSaveAsync(CancellationToken cancellationToken)
        {
            var changes = new List<AuditEntityChange>(_pending.Count);

            foreach (var item in _pending)
            {
                if (item.Operation != AuditOperationEnum.DELETE)
                {
                    item.Key = KeyOf(item.Entry);
                    item.Document = await DocumentOfAsync(item.Entry.Entity, cancellationToken);
                    if (item.Operation == AuditOperationEnum.INSERT)
                        item.New = Snapshot(item.Entry, original: false);
                }

                changes.Add(new AuditEntityChange
                {
                    EntityType = item.Entry.Metadata.ClrType.Name,
                    EntityKey = item.Key!,
                    Operation = item.Operation,
                    DocumentKind = item.Document.Kind,
                    DocumentId = item.Document.Id,
                    OldValues = item.Old == null ? null : JsonSerializer.Serialize(item.Old, Json),
                    NewValues = item.New == null ? null : JsonSerializer.Serialize(item.New, Json),
                });
            }

            return changes;
        }

        private static Dictionary<string, object?> Snapshot(EntityEntry entry, bool original)
        {
            var type = entry.Metadata.ClrType;
            var values = new Dictionary<string, object?>();
            foreach (var property in entry.Properties)
            {
                var name = property.Metadata.Name;
                if (IsIgnored(type, name))
                    continue;

                values[name] = IsRedacted(type, name) ? RedactedValue : original ? property.OriginalValue : property.CurrentValue;
            }

            return values;
        }

        private static bool IsIgnored(Type type, string property) => Ignored.TryGetValue(type, out var names) && names.Contains(property);

        private static bool IsRedacted(Type type, string property) => Redacted.TryGetValue(type, out var names) && names.Contains(property);

        /// <summary>"42", or the composite key's parts in key order joined by commas.</summary>
        private static string KeyOf(EntityEntry entry)
        {
            var key = entry.Metadata.FindPrimaryKey()!;
            return string.Join(",", key.Properties.Select(p => FormatKeyPart(entry.Property(p.Name).CurrentValue)));
        }

        private static string FormatKeyPart(object? value) => value switch
        {
            null => "",
            Enum e => Convert.ToInt64(e, CultureInfo.InvariantCulture).ToString(CultureInfo.InvariantCulture),
            _ => Convert.ToString(value, CultureInfo.InvariantCulture) ?? "",
        };

        /// <summary>
        /// The document a row belongs to. The four document kinds and every table under them; anything else (customers,
        /// products, users, units) belongs to no document and is found by its own EntityType + EntityKey instead.
        /// </summary>
        private async Task<(DocumentKindEnum? Kind, int? Id)> DocumentOfAsync(object entity, CancellationToken ct)
        {
            switch (entity)
            {
                case Sale x: return (DocumentKindEnum.SALE, x.Id);
                case SaleItem x: return (DocumentKindEnum.SALE, x.SaleId);
                case SaleDriver x: return (DocumentKindEnum.SALE, x.SaleId);
                case SaleShippingNote x: return (DocumentKindEnum.SALE, x.SaleId);
                case SaleProformaStageEvent x: return (DocumentKindEnum.SALE, x.SaleId);
                case SaleWarehouseIssue x: return (DocumentKindEnum.SALE, x.SaleId);
                case SaleInstallmentPlan x: return (DocumentKindEnum.SALE, x.SaleId);
                case SaleInstallment x:
                    return Of(DocumentKindEnum.SALE, await ParentIdAsync<SaleInstallmentPlan>(x.SaleInstallmentPlanId, nameof(SaleInstallmentPlan.SaleId), ct));

                case Purchase x: return (DocumentKindEnum.PURCHASE, x.Id);
                case PurchaseItem x: return (DocumentKindEnum.PURCHASE, x.PurchaseId);
                case PurchaseDriver x: return (DocumentKindEnum.PURCHASE, x.PurchaseId);
                case PurchaseReceivingNote x: return (DocumentKindEnum.PURCHASE, x.PurchaseId);
                case PurchaseReceivingImage x: return (DocumentKindEnum.PURCHASE, x.PurchaseId);
                case PurchaseReceivingDiscrepancy x: return (DocumentKindEnum.PURCHASE, x.PurchaseId);

                case PaymentDetail x:
                    return x.SaleId.HasValue ? (DocumentKindEnum.SALE, x.SaleId)
                        : x.PurchaseId.HasValue ? (DocumentKindEnum.PURCHASE, x.PurchaseId)
                        : (null, null);

                case DocumentAttachment x: return (x.DocumentKind, x.DocumentId);

                case PurchaseReturn x: return (DocumentKindEnum.PURCHASE_RETURN, x.Id);
                case PurchaseReturnClaim x: return (DocumentKindEnum.PURCHASE_RETURN, x.PurchaseReturnId);
                case PurchaseReturnResolution x:
                    return Of(DocumentKindEnum.PURCHASE_RETURN, await PurchaseReturnOfClaimAsync(x.PurchaseReturnClaimId, ct));
                case PurchaseReturnEffect x:
                    return Of(DocumentKindEnum.PURCHASE_RETURN, await PurchaseReturnOfEffectAsync(x.Id, ct));
                case PurchaseReturnEffectRound x:
                    return Of(DocumentKindEnum.PURCHASE_RETURN, await PurchaseReturnOfEffectAsync(x.PurchaseReturnEffectId, ct));
                case PurchaseReturnEffectMoneyPart x:
                    return Of(DocumentKindEnum.PURCHASE_RETURN, await PurchaseReturnOfEffectAsync(x.PurchaseReturnEffectId, ct));
                case PurchaseReturnEffectObservation x:
                    var purchaseEffectId = await ParentIdAsync<PurchaseReturnEffectRound>(x.PurchaseReturnEffectRoundId, nameof(PurchaseReturnEffectRound.PurchaseReturnEffectId), ct);
                    return Of(DocumentKindEnum.PURCHASE_RETURN, purchaseEffectId.HasValue ? await PurchaseReturnOfEffectAsync(purchaseEffectId.Value, ct) : null);

                case SaleReturn x: return (DocumentKindEnum.SALE_RETURN, x.Id);
                case SaleReturnClaim x: return (DocumentKindEnum.SALE_RETURN, x.SaleReturnId);
                case SaleReturnResolution x:
                    return Of(DocumentKindEnum.SALE_RETURN, await SaleReturnOfClaimAsync(x.SaleReturnClaimId, ct));
                case SaleReturnEffect x:
                    return Of(DocumentKindEnum.SALE_RETURN, await SaleReturnOfEffectAsync(x.Id, ct));
                case SaleReturnEffectRound x:
                    return Of(DocumentKindEnum.SALE_RETURN, await SaleReturnOfEffectAsync(x.SaleReturnEffectId, ct));
                case SaleReturnEffectMoneyPart x:
                    return Of(DocumentKindEnum.SALE_RETURN, await SaleReturnOfEffectAsync(x.SaleReturnEffectId, ct));
                case SaleReturnEffectObservation x:
                    var saleEffectId = await ParentIdAsync<SaleReturnEffectRound>(x.SaleReturnEffectRoundId, nameof(SaleReturnEffectRound.SaleReturnEffectId), ct);
                    return Of(DocumentKindEnum.SALE_RETURN, saleEffectId.HasValue ? await SaleReturnOfEffectAsync(saleEffectId.Value, ct) : null);

                default: return (null, null);
            }
        }

        private static (DocumentKindEnum? Kind, int? Id) Of(DocumentKindEnum kind, int? id) => id.HasValue ? (kind, id) : (null, null);

        private Task<int?> PurchaseReturnOfClaimAsync(int claimId, CancellationToken ct) =>
            ParentIdAsync<PurchaseReturnClaim>(claimId, nameof(PurchaseReturnClaim.PurchaseReturnId), ct);

        private async Task<int?> PurchaseReturnOfEffectAsync(int effectId, CancellationToken ct)
        {
            var resolutionId = await ParentIdAsync<PurchaseReturnEffect>(effectId, nameof(PurchaseReturnEffect.PurchaseReturnResolutionId), ct);
            if (!resolutionId.HasValue)
                return null;

            var claimId = await ParentIdAsync<PurchaseReturnResolution>(resolutionId.Value, nameof(PurchaseReturnResolution.PurchaseReturnClaimId), ct);
            return claimId.HasValue ? await PurchaseReturnOfClaimAsync(claimId.Value, ct) : null;
        }

        private Task<int?> SaleReturnOfClaimAsync(int claimId, CancellationToken ct) =>
            ParentIdAsync<SaleReturnClaim>(claimId, nameof(SaleReturnClaim.SaleReturnId), ct);

        private async Task<int?> SaleReturnOfEffectAsync(int effectId, CancellationToken ct)
        {
            var resolutionId = await ParentIdAsync<SaleReturnEffect>(effectId, nameof(SaleReturnEffect.SaleReturnResolutionId), ct);
            if (!resolutionId.HasValue)
                return null;

            var claimId = await ParentIdAsync<SaleReturnResolution>(resolutionId.Value, nameof(SaleReturnResolution.SaleReturnClaimId), ct);
            return claimId.HasValue ? await SaleReturnOfClaimAsync(claimId.Value, ct) : null;
        }

        /// <summary>
        /// The <paramref name="foreignKey"/> of the <typeparamref name="T"/> row with this id: from the change tracker when
        /// it is loaded (it normally is - children are added through a loaded parent, and a deleted parent is still
        /// tracked), otherwise one query. Change detection is off here (see WMSDbContext), so the tracker scan is cheap.
        /// </summary>
        private async Task<int?> ParentIdAsync<T>(int id, string foreignKey, CancellationToken ct) where T : class
        {
            foreach (var entry in _context.ChangeTracker.Entries<T>())
            {
                if (entry.Property("Id").CurrentValue is int entryId && entryId == id)
                    return entry.Property(foreignKey).CurrentValue as int?;
            }

            return await _context.Set<T>().AsNoTracking()
                .Where(x => EF.Property<int>(x, "Id") == id)
                .Select(x => (int?)EF.Property<int>(x, foreignKey))
                .FirstOrDefaultAsync(ct);
        }

        private sealed class Pending
        {
            public Pending(EntityEntry entry, AuditOperationEnum operation)
            {
                Entry = entry;
                Operation = operation;
            }

            public EntityEntry Entry { get; }
            public AuditOperationEnum Operation { get; }
            public Dictionary<string, object?>? Old { get; init; }
            public Dictionary<string, object?>? New { get; set; }
            public string? Key { get; set; }
            public (DocumentKindEnum? Kind, int? Id) Document { get; set; }
        }
    }
}
