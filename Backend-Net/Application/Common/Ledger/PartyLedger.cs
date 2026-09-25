using Application.Common.Documents;
using Application.Common.Contracts.Context;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Ledger
{
    /// <summary>
    /// The only writer of <see cref="PartyLedgerEntry"/>. Every method stages rows on the context and never saves, so a
    /// row lands in the same SaveChanges as the change it records. References go through navigations, so a sale or payment
    /// created in the same request is linked correctly before it has an id.
    ///
    /// Balance = sum(DEBIT) - sum(CREDIT); positive = the party owes us. The rules, the same for customers and suppliers:
    ///   invoice issued (sale)        DEBIT   the customer owes the total
    ///   invoice recorded (purchase)  CREDIT  we owe the supplier the total
    ///   purchase supplement          CREDIT  we owe the supplement line
    ///   purchase line closed short   DEBIT   the undelivered share of the line comes off what we owe (the invoice itself
    ///                                        is never edited - this is its credit note)
    ///   installment charge           DEBIT   the customer owes the charge on top of the invoice
    ///   payment IN (money to us)     CREDIT  - a customer paying, or a supplier refunding
    ///   payment OUT (money from us)  DEBIT   - us paying a supplier, or refunding a customer
    ///   return money ON_ACCOUNT      IN = DEBIT, OUT = CREDIT (no cash: the amount stays on the account)
    /// Anything taken back (voided payment, cancelled invoice, changed charge, removed return money) gets a REVERSAL row
    /// on the opposite side pointing at the original; nothing is ever edited or deleted.
    /// </summary>
    public static class PartyLedger
    {
        public static Task SaleInvoiceIssuedAsync(IWMSDbContext context, Sale sale, DateTime occurredAt, CancellationToken cancellationToken) =>
            AddAsync(context, Customer(sale), PartyLedgerDirectionEnum.DEBIT, sale.TotalAmount, PartyLedgerEntryTypeEnum.SALE_INVOICE,
                occurredAt, $"فاکتور فروش {sale.InvoiceNumber}", sale: sale, cancellationToken: cancellationToken);

        public static Task PurchaseInvoiceRecordedAsync(IWMSDbContext context, Purchase purchase, DateTime occurredAt, CancellationToken cancellationToken) =>
            AddAsync(context, Supplier(purchase), PartyLedgerDirectionEnum.CREDIT, purchase.TotalAmount, PartyLedgerEntryTypeEnum.PURCHASE_INVOICE,
                occurredAt, $"فاکتور خرید {purchase.InvoiceNumber}", purchase: purchase, cancellationToken: cancellationToken);

        public static Task PurchaseSupplementAsync(IWMSDbContext context, Purchase purchase, ulong amount, DateTime occurredAt, CancellationToken cancellationToken) =>
            AddAsync(context, Supplier(purchase), PartyLedgerDirectionEnum.CREDIT, amount, PartyLedgerEntryTypeEnum.PURCHASE_SUPPLEMENT,
                occurredAt, $"ضمیمه‌ی فاکتور خرید {purchase.InvoiceNumber}", purchase: purchase, cancellationToken: cancellationToken);

        /// <summary>A line closed short: its undelivered share comes off what we owe the supplier (DEBIT).</summary>
        public static async Task PurchaseShortClosedAsync(IWMSDbContext context, Purchase purchase, PurchaseItem item, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var amount = InvoiceLineMath.ShareOfTotal(item.TotalAmount, item.Quantity, item.ShortClosedQuantity);
            if (amount == 0)
                return;

            await context.PartyLedgerEntries.AddAsync(new PartyLedgerEntry
            {
                SupplierId = purchase.SupplierId,
                Direction = PartyLedgerDirectionEnum.DEBIT,
                Amount = amount,
                EntryType = PartyLedgerEntryTypeEnum.PURCHASE_SHORT_CLOSE,
                OccurredAt = occurredAt,
                CreatedAt = DateTime.Now,
                Purchase = purchase,
                PurchaseItemId = item.Id,
                Description = $"کسری {item.ShortClosedQuantity} عدد، فاکتور خرید {purchase.InvoiceNumber}",
            }, cancellationToken);
        }

        public static async Task PurchaseItemReopenedAsync(IWMSDbContext context, PurchaseItem item, DateTime occurredAt, CancellationToken cancellationToken)
        {
            foreach (var entry in await OpenEntriesAsync(context, x => x.PurchaseItemId == item.Id && x.EntryType == PartyLedgerEntryTypeEnum.PURCHASE_SHORT_CLOSE, cancellationToken))
                await ReverseAsync(context, entry, occurredAt, "بازگشایی قلم خرید", cancellationToken);
        }

        public static Task InstallmentChargeAsync(IWMSDbContext context, Sale sale, ulong charge, DateTime occurredAt, CancellationToken cancellationToken) =>
            AddAsync(context, Customer(sale), PartyLedgerDirectionEnum.DEBIT, charge, PartyLedgerEntryTypeEnum.INSTALLMENT_CHARGE,
                occurredAt, $"سود اقساط فاکتور {sale.InvoiceNumber}", sale: sale, cancellationToken: cancellationToken);

        /// <summary>A payment row on a sale: money in is the customer paying (CREDIT), money out a refund (DEBIT).</summary>
        public static Task SalePaymentAsync(IWMSDbContext context, Sale sale, PaymentDetail payment, CancellationToken cancellationToken) =>
            AddAsync(context, Customer(sale), SideOf(payment.Direction), (ulong)payment.Amount, PartyLedgerEntryTypeEnum.PAYMENT,
                payment.PaidAt, $"پرداخت فاکتور فروش {sale.InvoiceNumber}".TrimEnd(), sale: sale, payment: payment, cancellationToken: cancellationToken);

        /// <summary>A payment row on a purchase: money out is us paying (DEBIT), money in a supplier refund (CREDIT).</summary>
        public static Task PurchasePaymentAsync(IWMSDbContext context, Purchase purchase, PaymentDetail payment, CancellationToken cancellationToken) =>
            AddAsync(context, Supplier(purchase), SideOf(payment.Direction), (ulong)payment.Amount, PartyLedgerEntryTypeEnum.PAYMENT,
                payment.PaidAt, $"پرداخت فاکتور خرید {purchase.InvoiceNumber}".TrimEnd(), purchase: purchase, payment: payment, cancellationToken: cancellationToken);

        public static async Task PaymentVoidedAsync(IWMSDbContext context, PaymentDetail payment, DateTime occurredAt, CancellationToken cancellationToken)
        {
            foreach (var entry in await OpenEntriesAsync(context, x => x.PaymentDetailId == payment.Id, cancellationToken))
                await ReverseAsync(context, entry, occurredAt, "ابطال پرداخت", cancellationToken);
        }

        /// <summary>Reverses what an issued sale still carries: its invoice and, if any, its installment charge.</summary>
        public static async Task SaleCancelledAsync(IWMSDbContext context, Sale sale, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var entries = await OpenEntriesAsync(context,
                x => x.SaleId == sale.Id && (x.EntryType == PartyLedgerEntryTypeEnum.SALE_INVOICE || x.EntryType == PartyLedgerEntryTypeEnum.INSTALLMENT_CHARGE),
                cancellationToken);
            foreach (var entry in entries)
                await ReverseAsync(context, entry, occurredAt, $"لغو فاکتور فروش {sale.InvoiceNumber}", cancellationToken);
        }

        /// <summary>Reverses a cancelled purchase's invoice and supplements. A draft that never reached the ledger has none.
        /// (A purchase with anything received cannot be cancelled, so it never has short-close rows.)</summary>
        public static async Task PurchaseCancelledAsync(IWMSDbContext context, Purchase purchase, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var entries = await OpenEntriesAsync(context,
                x => x.PurchaseId == purchase.Id && (x.EntryType == PartyLedgerEntryTypeEnum.PURCHASE_INVOICE || x.EntryType == PartyLedgerEntryTypeEnum.PURCHASE_SUPPLEMENT),
                cancellationToken);
            foreach (var entry in entries)
                await ReverseAsync(context, entry, occurredAt, $"لغو فاکتور خرید {purchase.InvoiceNumber}", cancellationToken);
        }

        /// <summary>
        /// The sale's installment charge is now <paramref name="charge"/> (0 when the plan is cancelled). Reverses the
        /// current charge row and writes the new one, only when the amount really changed. Nothing is written for a sale
        /// that is still a proforma: its invoice is not in the ledger yet, and neither is its charge.
        /// </summary>
        public static async Task InstallmentChargeChangedAsync(IWMSDbContext context, Sale sale, ulong charge, DateTime occurredAt, CancellationToken cancellationToken)
        {
            if (sale.Status == SalesStatusEnum.PROFORMA)
                return;

            var current = await OpenEntriesAsync(context, x => x.SaleId == sale.Id && x.EntryType == PartyLedgerEntryTypeEnum.INSTALLMENT_CHARGE, cancellationToken);
            if (current.Count == 1 && current[0].Amount == charge)
                return;

            foreach (var entry in current)
                await ReverseAsync(context, entry, occurredAt, "تغییر سود اقساط", cancellationToken);

            if (charge > 0)
                await InstallmentChargeAsync(context, sale, charge, occurredAt, cancellationToken);
        }

        /// <summary>
        /// A return money effect as the party's account sees it. Money that actually moved (cash, cheque, transfer) nets to
        /// zero on the account - the goods coming back and the money going out cancel each other - so it writes nothing.
        /// Only the ON_ACCOUNT part is left on the account: IN = the party owes us (DEBIT), OUT = we owe the party (CREDIT).
        /// <paramref name="reversal"/> writes the opposite row, for a removed resolution.
        /// </summary>
        public static async Task ReturnSettlementAsync(
            IWMSDbContext context, int? customerId, int? supplierId, int? saleId, int? purchaseId, int? saleReturnClaimId, int? purchaseReturnClaimId,
            ReturnEffectDirectionEnum direction, ReturnPaymentMethodEnum? method, ulong amount, IEnumerable<(ReturnPaymentMethodEnum Method, ulong Amount)> parts,
            bool reversal, string description, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var onAccount = method switch
            {
                ReturnPaymentMethodEnum.ON_ACCOUNT => amount,
                ReturnPaymentMethodEnum.MIXED => parts.Where(p => p.Method == ReturnPaymentMethodEnum.ON_ACCOUNT).Aggregate(0UL, (sum, p) => sum + p.Amount),
                _ => 0UL,
            };
            if (onAccount == 0)
                return;

            var side = direction == ReturnEffectDirectionEnum.MONEY_IN ? PartyLedgerDirectionEnum.DEBIT : PartyLedgerDirectionEnum.CREDIT;
            if (!reversal)
            {
                await context.PartyLedgerEntries.AddAsync(new PartyLedgerEntry
                {
                    CustomerId = customerId,
                    SupplierId = supplierId,
                    Direction = side,
                    Amount = onAccount,
                    EntryType = PartyLedgerEntryTypeEnum.RETURN_SETTLEMENT,
                    OccurredAt = occurredAt,
                    CreatedAt = DateTime.Now,
                    SaleId = saleId,
                    PurchaseId = purchaseId,
                    SaleReturnClaimId = saleReturnClaimId,
                    PurchaseReturnClaimId = purchaseReturnClaimId,
                    Description = description,
                }, cancellationToken);
                return;
            }

            // The original row: same claim, side and amount, not yet taken back.
            var original = (await OpenEntriesAsync(context,
                    x => x.EntryType == PartyLedgerEntryTypeEnum.RETURN_SETTLEMENT && x.Direction == side && x.Amount == onAccount
                         && x.SaleReturnClaimId == saleReturnClaimId && x.PurchaseReturnClaimId == purchaseReturnClaimId,
                    cancellationToken))
                .FirstOrDefault();
            if (original != null)
                await ReverseAsync(context, original, occurredAt, "حذف تصمیم مرجوعی", cancellationToken);
        }

        /// <summary>A sale-return money effect applied (or, with <paramref name="reversal"/>, taken back) - see ReturnSettlementAsync.</summary>
        public static Task SaleReturnMoneyAsync(IWMSDbContext context, Sale sale, string returnNumber, int claimId, SaleReturnEffect effect, bool reversal, DateTime occurredAt, CancellationToken cancellationToken) =>
            ReturnSettlementAsync(context, sale.CustomerId, null, sale.Id, null, claimId, null,
                effect.Direction, effect.Method, effect.Amount ?? 0, effect.MoneyParts.Select(p => (p.Method, p.Amount)),
                reversal, $"مرجوعی فروش {returnNumber}", occurredAt, cancellationToken);

        /// <summary>A purchase-return money effect applied (or, with <paramref name="reversal"/>, taken back) - see ReturnSettlementAsync.</summary>
        public static Task PurchaseReturnMoneyAsync(IWMSDbContext context, Purchase purchase, string returnNumber, int claimId, PurchaseReturnEffect effect, bool reversal, DateTime occurredAt, CancellationToken cancellationToken) =>
            ReturnSettlementAsync(context, null, purchase.SupplierId, null, purchase.Id, null, claimId,
                effect.Direction, effect.Method, effect.Amount ?? 0, effect.MoneyParts.Select(p => (p.Method, p.Amount)),
                reversal, $"مرجوعی خرید {returnNumber}", occurredAt, cancellationToken);

        /// <summary>Balance of a customer or supplier: sum(DEBIT) - sum(CREDIT). Positive = they owe us.</summary>
        public static async Task<decimal> BalanceAsync(IWMSDbContext context, int? customerId, int? supplierId, CancellationToken cancellationToken)
        {
            var sides = await context.PartyLedgerEntries
                .Where(x => (customerId != null && x.CustomerId == customerId) || (supplierId != null && x.SupplierId == supplierId))
                .GroupBy(x => x.Direction)
                .Select(g => new { Direction = g.Key, Total = g.Sum(x => (decimal)x.Amount) })
                .ToListAsync(cancellationToken);

            return sides.Where(x => x.Direction == PartyLedgerDirectionEnum.DEBIT).Sum(x => x.Total)
                 - sides.Where(x => x.Direction == PartyLedgerDirectionEnum.CREDIT).Sum(x => x.Total);
        }

        /// <summary>Balances of many parties in one query, for a list page. Parties with no rows are absent (balance 0).</summary>
        public static async Task<Dictionary<int, decimal>> CustomerBalancesAsync(IWMSDbContext context, IReadOnlyCollection<int> customerIds, CancellationToken cancellationToken)
        {
            var rows = await context.PartyLedgerEntries
                .Where(x => x.CustomerId != null && customerIds.Contains(x.CustomerId.Value))
                .GroupBy(x => new { PartyId = x.CustomerId!.Value, x.Direction })
                .Select(g => new { g.Key.PartyId, g.Key.Direction, Total = g.Sum(x => (decimal)x.Amount) })
                .ToListAsync(cancellationToken);
            return Net(rows.Select(r => (r.PartyId, r.Direction, r.Total)));
        }

        public static async Task<Dictionary<int, decimal>> SupplierBalancesAsync(IWMSDbContext context, IReadOnlyCollection<int> supplierIds, CancellationToken cancellationToken)
        {
            var rows = await context.PartyLedgerEntries
                .Where(x => x.SupplierId != null && supplierIds.Contains(x.SupplierId.Value))
                .GroupBy(x => new { PartyId = x.SupplierId!.Value, x.Direction })
                .Select(g => new { g.Key.PartyId, g.Key.Direction, Total = g.Sum(x => (decimal)x.Amount) })
                .ToListAsync(cancellationToken);
            return Net(rows.Select(r => (r.PartyId, r.Direction, r.Total)));
        }

        private static Dictionary<int, decimal> Net(IEnumerable<(int PartyId, PartyLedgerDirectionEnum Direction, decimal Total)> rows) =>
            rows.GroupBy(r => r.PartyId)
                .ToDictionary(g => g.Key, g => g.Sum(r => r.Direction == PartyLedgerDirectionEnum.DEBIT ? r.Total : -r.Total));

        // ------------------------------------------------------------------

        private static (int? CustomerId, int? SupplierId) Customer(Sale sale) => (sale.CustomerId, null);
        private static (int? CustomerId, int? SupplierId) Supplier(Purchase purchase) => (null, purchase.SupplierId);

        /// <summary>Money into us lowers what the party owes (CREDIT); money out of us raises it (DEBIT).</summary>
        private static PartyLedgerDirectionEnum SideOf(PaymentDirectionEnum payment) =>
            payment == PaymentDirectionEnum.IN ? PartyLedgerDirectionEnum.CREDIT : PartyLedgerDirectionEnum.DEBIT;

        private static async Task AddAsync(
            IWMSDbContext context, (int? CustomerId, int? SupplierId) party, PartyLedgerDirectionEnum direction, ulong amount,
            PartyLedgerEntryTypeEnum type, DateTime occurredAt, string description,
            Sale? sale = null, Purchase? purchase = null, PaymentDetail? payment = null, CancellationToken cancellationToken = default)
        {
            // A zero amount records nothing (and the table refuses it): an empty invoice, a 0% charge.
            if (amount == 0)
                return;

            await context.PartyLedgerEntries.AddAsync(new PartyLedgerEntry
            {
                CustomerId = party.CustomerId,
                SupplierId = party.SupplierId,
                Direction = direction,
                Amount = amount,
                EntryType = type,
                OccurredAt = occurredAt,
                CreatedAt = DateTime.Now,
                Sale = sale,
                Purchase = purchase,
                PaymentDetail = payment,
                Description = description,
            }, cancellationToken);
        }

        private static async Task ReverseAsync(IWMSDbContext context, PartyLedgerEntry original, DateTime occurredAt, string description, CancellationToken cancellationToken)
        {
            await context.PartyLedgerEntries.AddAsync(new PartyLedgerEntry
            {
                CustomerId = original.CustomerId,
                SupplierId = original.SupplierId,
                Direction = original.Direction == PartyLedgerDirectionEnum.DEBIT ? PartyLedgerDirectionEnum.CREDIT : PartyLedgerDirectionEnum.DEBIT,
                Amount = original.Amount,
                EntryType = PartyLedgerEntryTypeEnum.REVERSAL,
                OccurredAt = occurredAt,
                CreatedAt = DateTime.Now,
                SaleId = original.SaleId,
                PurchaseId = original.PurchaseId,
                PaymentDetailId = original.PaymentDetailId,
                SaleReturnClaimId = original.SaleReturnClaimId,
                PurchaseReturnClaimId = original.PurchaseReturnClaimId,
                PurchaseItemId = original.PurchaseItemId,
                ReversalOfEntryId = original.Id,
                Description = description,
            }, cancellationToken);
        }

        /// <summary>Saved rows matching the filter that no REVERSAL points at yet.</summary>
        private static Task<List<PartyLedgerEntry>> OpenEntriesAsync(IWMSDbContext context, System.Linq.Expressions.Expression<Func<PartyLedgerEntry, bool>> filter, CancellationToken cancellationToken) =>
            context.PartyLedgerEntries
                .Where(filter)
                .Where(x => x.EntryType != PartyLedgerEntryTypeEnum.REVERSAL)
                .Where(x => !context.PartyLedgerEntries.Any(r => r.ReversalOfEntryId == x.Id))
                .OrderBy(x => x.Id)
                .ToListAsync(cancellationToken);
    }
}
