using Application.Common.Contracts.Context;
using Application.Common.Settings;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Credit
{
    /// <summary>
    /// Customer credit limit (GAP-06). Run by WMSDbContext.SaveChangesAsync on every save, so no command - present or
    /// future - can issue credit past a customer's limit by forgetting to call it.
    ///
    /// Exposure = the customer's party-ledger balance + their received cheques not cleared yet (PENDING or ENDORSED).
    ///  - Unpaid and future installments are in it: issuing an installment sale debits the whole invoice and the charge,
    ///    and only paid installments credit it back.
    ///  - A cheque credits the ledger the day it is received, but it is not money until it clears, so it is added back.
    ///
    /// Triggers: a save that stages a new customer DEBIT of type SALE_INVOICE or INSTALLMENT_CHARGE - the only rows that
    /// give a customer new credit. Corrections (voiding a payment, a bounced cheque, an opening balance) are not blocked:
    /// they record what really happened.
    ///
    /// Refused when the limit is on (setting Sale.CreditLimitEnforced), the customer has one (CreditLimit not null) and
    /// the save leaves exposure above the limit AND higher than before it. So 0 means cash only, and a customer already
    /// over the limit can still buy if they pay in full (in cash, card or transfer - a cheque is not cash yet).
    /// There is no override: raise the customer's limit, clear it, or turn the setting off.
    ///
    /// Inside IUnitOfWork.ExecuteInTransactionAsync the check runs once, on the final state, just before commit (a
    /// <see cref="Batch"/>): CompleteInPersonSale and AddSalePayments save one payment row at a time, and the first save
    /// issues the invoice with only that row paid, so a per-save check refused a sale paid in full in two cash rows
    /// (frontend-requests 31.1). Each save of the batch only records the customer's exposure before it was first touched.
    /// </summary>
    public static class CreditLimitGuard
    {
        /// <summary>Payment statuses of a received cheque that is not money yet. Null = a new cheque (PENDING once saved).</summary>
        private static bool IsUncleared(PaymentDetail payment) =>
            payment.Type == PaymentTypeEnum.CHECK
            && payment.Direction == PaymentDirectionEnum.IN
            && payment.VoidedAt == null
            && payment.CheckStatus is null or PaymentCheckStatusEnum.PENDING or PaymentCheckStatusEnum.ENDORSED;

        /// <summary>The customers a save gives new credit: staged DEBITs of type SALE_INVOICE or INSTALLMENT_CHARGE.</summary>
        private static List<int> TriggeringCustomers(IWMSDbContext context) =>
            context.ChangeTracker.Entries<PartyLedgerEntry>()
                .Where(x => x.State == EntityState.Added && x.Entity.CustomerId != null
                            && x.Entity.Direction == PartyLedgerDirectionEnum.DEBIT
                            && x.Entity.EntryType is PartyLedgerEntryTypeEnum.SALE_INVOICE or PartyLedgerEntryTypeEnum.INSTALLMENT_CHARGE)
                .Select(x => x.Entity.CustomerId!.Value)
                .Distinct()
                .ToList();

        private sealed record LimitRow(int Id, string FirstName, string LastName, ulong Limit);

        /// <summary>The customers among <paramref name="customerIds"/> that have a limit, or none when the setting is off.</summary>
        private static async Task<List<LimitRow>> LimitsAsync(IWMSDbContext context, List<int> customerIds, CancellationToken cancellationToken)
        {
            if (customerIds.Count == 0)
                return new List<LimitRow>();
            var limits = await context.Customers.AsNoTracking()
                .Where(x => customerIds.Contains(x.Id) && x.CreditLimit != null)
                .Select(x => new LimitRow(x.Id, x.FirstName, x.LastName, x.CreditLimit!.Value))
                .ToListAsync(cancellationToken);
            if (limits.Count == 0)
                return limits;
            return await SystemSettingValues.GetBooleanAsync(context, SystemSettingCatalog.SaleCreditLimitEnforced, cancellationToken)
                ? limits
                : new List<LimitRow>();
        }

        /// <summary>One save, outside a unit-of-work transaction: before = saved rows, after = before + what this save stages.</summary>
        public static async Task EnsureAsync(IWMSDbContext context, CancellationToken cancellationToken)
        {
            var staged = context.ChangeTracker.Entries<PartyLedgerEntry>()
                .Where(x => x.State == EntityState.Added && x.Entity.CustomerId != null)
                .Select(x => x.Entity)
                .ToList();

            foreach (var customer in await LimitsAsync(context, TriggeringCustomers(context), cancellationToken))
            {
                var before = await SavedExposureAsync(context, customer.Id, cancellationToken);
                var after = before.Total
                            + staged.Where(x => x.CustomerId == customer.Id)
                                .Sum(x => x.Direction == PartyLedgerDirectionEnum.DEBIT ? (decimal)x.Amount : -(decimal)x.Amount)
                            + await StagedChequeChangeAsync(context, customer.Id, cancellationToken);
                ThrowIfOver(customer, before, after);
            }
        }

        /// <summary>
        /// The state of one unit-of-work transaction (see the class remarks): each customer's exposure before the first save
        /// that gave them credit.
        /// </summary>
        public sealed class Batch
        {
            internal Dictionary<int, CreditExposure> Before { get; } = new();
        }

        /// <summary>A save inside a batch: remember the exposure of newly touched customers, check nothing yet.</summary>
        public static async Task RecordAsync(IWMSDbContext context, Batch batch, CancellationToken cancellationToken)
        {
            foreach (var customerId in TriggeringCustomers(context).Where(id => !batch.Before.ContainsKey(id)))
                batch.Before[customerId] = await SavedExposureAsync(context, customerId, cancellationToken);
        }

        /// <summary>End of a batch, before commit: every save is in the database, so after = the saved exposure now.</summary>
        public static async Task EnsureBatchAsync(IWMSDbContext context, Batch batch, CancellationToken cancellationToken)
        {
            foreach (var customer in await LimitsAsync(context, batch.Before.Keys.ToList(), cancellationToken))
            {
                var before = batch.Before[customer.Id];
                var after = (await SavedExposureAsync(context, customer.Id, cancellationToken)).Total;
                ThrowIfOver(customer, before, after);
            }
        }

        /// <summary>The rule: refused when the exposure ends above the limit AND higher than it was.</summary>
        private static void ThrowIfOver(LimitRow customer, CreditExposure before, decimal after)
        {
            if (after <= customer.Limit || after <= before.Total)
                return;

            var name = $"{customer.FirstName} {customer.LastName}".Trim();
            var added = after - before.Total;
            var excess = after - customer.Limit;
            var message = customer.Limit == 0
                ? $"سقف اعتبار «{name}» صفر است و فقط فروش نقدی دارد؛ این فاکتور {Rial(added)} نسیه (یا چک وصول‌نشده) به حسابش اضافه می‌کند. " +
                  "مبلغ را کامل نقد، کارت یا انتقال دریافت کنید، یا سقف اعتبار مشتری را تغییر دهید."
                : $"این فروش از سقف اعتبار «{name}» بیشتر است. سقف اعتبار: {Rial(customer.Limit)}، " +
                  $"بدهی فعلی (با چک‌های وصول‌نشده و اقساط باقی): {Rial(before.Total)}، افزایش با این فاکتور: {Rial(added)}، " +
                  $"مازاد بر سقف: {Rial(excess)}. بخشی از مبلغ را نقد دریافت کنید، یا سقف اعتبار مشتری را افزایش دهید.";
            throw new ValidationCustomException(message, new CreditLimitExceededDto
            {
                CreditLimitExceeded = true,
                CustomerId = customer.Id,
                CustomerName = name,
                CreditLimit = customer.Limit,
                CurrentExposure = before.Total,
                UnclearedCheques = before.UnclearedCheques,
                AddedAmount = added,
                Exposure = after,
                Excess = excess,
            });
        }

        /// <summary>
        /// What the customer owes on credit right now, from saved rows only: ledger balance + received cheques not cleared.
        /// Also read by the customer detail, so the screen and the rule agree.
        /// </summary>
        public static async Task<CreditExposure> SavedExposureAsync(IWMSDbContext context, int customerId, CancellationToken cancellationToken)
        {
            var balance = await Ledger.PartyLedger.BalanceAsync(context, customerId, null, cancellationToken);
            var cheques = await UnclearedChequesQuery(context, customerId).SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0;
            return new CreditExposure(balance, cheques);
        }

        /// <summary>Uncleared received cheques of many customers in one query, for a list page. Absent = 0.</summary>
        public static async Task<Dictionary<int, decimal>> UnclearedChequesByCustomerAsync(IWMSDbContext context, IReadOnlyCollection<int> customerIds, CancellationToken cancellationToken)
        {
            if (customerIds.Count == 0)
                return new Dictionary<int, decimal>();

            var rows = await context.PaymentDetails.AsNoTracking()
                .Where(x => x.Type == PaymentTypeEnum.CHECK
                            && x.Direction == PaymentDirectionEnum.IN
                            && x.VoidedAt == null
                            && (x.CheckStatus == PaymentCheckStatusEnum.PENDING || x.CheckStatus == PaymentCheckStatusEnum.ENDORSED))
                .Select(x => new { CustomerId = x.CustomerId ?? (x.SaleId != null ? (int?)x.Sale!.CustomerId : null), x.Amount })
                .Where(x => x.CustomerId != null && customerIds.Contains(x.CustomerId.Value))
                .GroupBy(x => x.CustomerId!.Value)
                .Select(g => new { CustomerId = g.Key, Total = g.Sum(x => x.Amount) })
                .ToListAsync(cancellationToken);
            return rows.ToDictionary(x => x.CustomerId, x => x.Total);
        }

        private static IQueryable<PaymentDetail> UnclearedChequesQuery(IWMSDbContext context, int customerId) =>
            context.PaymentDetails.AsNoTracking().Where(x =>
                x.Type == PaymentTypeEnum.CHECK
                && x.Direction == PaymentDirectionEnum.IN
                && x.VoidedAt == null
                && (x.CheckStatus == PaymentCheckStatusEnum.PENDING || x.CheckStatus == PaymentCheckStatusEnum.ENDORSED)
                && (x.CustomerId == customerId || (x.SaleId != null && x.Sale!.CustomerId == customerId)));

        /// <summary>
        /// How this save changes the customer's uncleared cheques: a new cheque row adds, a cheque voided/cashed/bounced in
        /// the same save takes its saved amount off.
        /// </summary>
        private static async Task<decimal> StagedChequeChangeAsync(IWMSDbContext context, int customerId, CancellationToken cancellationToken)
        {
            decimal change = 0;
            foreach (var entry in context.ChangeTracker.Entries<PaymentDetail>().ToList())
            {
                if (entry.Entity.Type != PaymentTypeEnum.CHECK)
                    continue;
                if (entry.State is not (EntityState.Added or EntityState.Modified))
                    continue;
                if (await CustomerOfAsync(context, entry.Entity, cancellationToken) != customerId)
                    continue;

                if (entry.State == EntityState.Added)
                {
                    if (IsUncleared(entry.Entity))
                        change += entry.Entity.Amount;
                    continue;
                }

                var wasUncleared = entry.Property(x => x.VoidedAt).OriginalValue == null
                                   && entry.Property(x => x.CheckStatus).OriginalValue
                                       is PaymentCheckStatusEnum.PENDING or PaymentCheckStatusEnum.ENDORSED
                                   && entry.Entity.Direction == PaymentDirectionEnum.IN;
                var isUncleared = IsUncleared(entry.Entity);
                if (wasUncleared && !isUncleared)
                    change -= entry.Property(x => x.Amount).OriginalValue;
                else if (!wasUncleared && isUncleared)
                    change += entry.Entity.Amount;
            }
            return change;
        }

        private static async Task<int?> CustomerOfAsync(IWMSDbContext context, PaymentDetail payment, CancellationToken cancellationToken)
        {
            if (payment.CustomerId != null)
                return payment.CustomerId;
            if (payment.Sale != null)
                return payment.Sale.CustomerId;
            if (payment.SaleId == null)
                return null;
            return await context.Sales.AsNoTracking().Where(x => x.Id == payment.SaleId).Select(x => (int?)x.CustomerId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        private static string Rial(decimal amount) => amount.ToString("N0", System.Globalization.CultureInfo.InvariantCulture) + " ریال";
    }

    public record CreditExposure(decimal LedgerBalance, decimal UnclearedCheques)
    {
        public decimal Total => LedgerBalance + UnclearedCheques;
    }

    /// <summary>The Data of the 400 a credit-limit refusal returns, for a screen that wants the numbers.</summary>
    public class CreditLimitExceededDto
    {
        public bool CreditLimitExceeded { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public ulong CreditLimit { get; set; }
        /// <summary>Exposure before this request: ledger balance + uncleared cheques.</summary>
        public decimal CurrentExposure { get; set; }
        public decimal UnclearedCheques { get; set; }
        /// <summary>How much this request adds.</summary>
        public decimal AddedAmount { get; set; }
        /// <summary>Exposure if the request had been saved.</summary>
        public decimal Exposure { get; set; }
        public decimal Excess { get; set; }
    }
}
