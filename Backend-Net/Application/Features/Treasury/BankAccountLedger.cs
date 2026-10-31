using Application.Common.Contracts.Context;
using Application.Features.Accounting;
using Application.Features.Treasury.Dtos;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Treasury
{
    /// <summary>
    /// The one definition of what moves a cash box or bank account: its opening balance, every non-voided payment row naming
    /// it (IN adds, OUT subtracts) and every non-voided transfer between our accounts. A cheque row moves it only once
    /// CASHED, on the day it was cashed (CheckStatusChangedAt) - a cheque in hand or not yet cleared is in no balance. Nothing stores a running balance; it is
    /// always summed from these, so it cannot drift from the rows. Read-side only.
    /// </summary>
    public static class BankAccountLedger
    {
        /// <summary>Net movement (without the opening balance) per account, optionally only before <paramref name="before"/>.</summary>
        public static async Task<Dictionary<int, decimal>> NetMovementsAsync(IWMSDbContext context, IReadOnlyCollection<int> accountIds, DateTime? before, CancellationToken cancellationToken)
        {
            var payments = await Counted(context.PaymentDetails.AsNoTracking())
                .Where(x => x.BankAccountId != null && accountIds.Contains(x.BankAccountId.Value))
                .Where(x => before == null || (x.Type == PaymentTypeEnum.CHECK ? x.CheckStatusChangedAt : x.PaidAt) < before)
                .GroupBy(x => new { AccountId = x.BankAccountId!.Value, x.Direction })
                .Select(g => new { g.Key.AccountId, g.Key.Direction, Total = g.Sum(x => x.Amount) })
                .ToListAsync(cancellationToken);

            var transfersIn = await context.BankAccountTransfers.AsNoTracking()
                .Where(x => accountIds.Contains(x.ToBankAccountId) && x.VoidedAt == null && (before == null || x.TransferredAt < before))
                .GroupBy(x => x.ToBankAccountId)
                .Select(g => new { AccountId = g.Key, Total = g.Sum(x => (decimal)x.Amount) })
                .ToListAsync(cancellationToken);

            var transfersOut = await context.BankAccountTransfers.AsNoTracking()
                .Where(x => accountIds.Contains(x.FromBankAccountId) && x.VoidedAt == null && (before == null || x.TransferredAt < before))
                .GroupBy(x => x.FromBankAccountId)
                .Select(g => new { AccountId = g.Key, Total = g.Sum(x => (decimal)x.Amount) })
                .ToListAsync(cancellationToken);

            var net = accountIds.ToDictionary(id => id, _ => 0m);
            foreach (var p in payments)
                net[p.AccountId] += p.Direction == PaymentDirectionEnum.IN ? p.Total : -p.Total;
            foreach (var r in await ReturnMoneyAsync(context, q => q.Where(x => accountIds.Contains(x.AccountId) && (before == null || x.OccurredAt < before)), cancellationToken))
                net[r.AccountId] += r.IsIn ? r.Amount : -r.Amount;
            foreach (var t in transfersIn)
                net[t.AccountId] += t.Total;
            foreach (var t in transfersOut)
                net[t.AccountId] -= t.Total;
            return net;
        }

        /// <summary>Money recorded with no account: net IN minus OUT of the non-voided payment rows without a BankAccountId.</summary>
        public static async Task<decimal> UnassignedNetAsync(IWMSDbContext context, CancellationToken cancellationToken)
        {
            var sides = await Counted(context.PaymentDetails.AsNoTracking())
                .Where(x => x.BankAccountId == null && x.Type != PaymentTypeEnum.CREDIT)
                .GroupBy(x => x.Direction)
                .Select(g => new { Direction = g.Key, Total = g.Sum(x => x.Amount) })
                .ToListAsync(cancellationToken);
            return sides.Sum(x => x.Direction == PaymentDirectionEnum.IN ? x.Total : -x.Total);
        }

        public static BankAccountDto ToDto(BankAccount x, decimal netMovements) => new()
        {
            Id = x.Id,
            Title = x.Title,
            Kind = x.Kind,
            KindTitle = x.Kind.GetDescription(),
            BankName = x.BankName,
            AccountNumber = x.AccountNumber,
            CardNumber = x.CardNumber,
            Iban = x.Iban,
            OpeningBalance = x.OpeningBalance,
            OpeningDate = x.OpeningDate,
            Description = x.Description,
            IsActive = x.IsActive,
            Balance = x.OpeningBalance + netMovements,
        };

        public static async Task<BankAccountDto> ReadAsync(IWMSDbContext context, int id, CancellationToken cancellationToken)
        {
            var account = await context.BankAccounts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
                ?? throw new global::Common.Exceptions.NotFoundCustomException("صندوق/حساب بانکی مورد نظر یافت نشد.");
            var net = await NetMovementsAsync(context, new[] { id }, null, cancellationToken);
            return ToDto(account, net[id]);
        }

        /// <summary>The statement lines of one account in [from, to), oldest first, without running balances.</summary>
        public static async Task<List<BankAccountMovementDto>> MovementsAsync(IWMSDbContext context, int accountId, DateTime? from, DateTime? to, CancellationToken cancellationToken)
        {
            var payments = await Counted(context.PaymentDetails.AsNoTracking())
                .Where(x => x.BankAccountId == accountId)
                .Where(x => from == null || (x.Type == PaymentTypeEnum.CHECK ? x.CheckStatusChangedAt : x.PaidAt) >= from)
                .Where(x => to == null || (x.Type == PaymentTypeEnum.CHECK ? x.CheckStatusChangedAt : x.PaidAt) < to)
                .Select(x => new BankAccountMovementDto
                {
                    Kind = BankAccountMovementKindEnum.PAYMENT,
                    OccurredAt = x.Type == PaymentTypeEnum.CHECK ? x.CheckStatusChangedAt!.Value : x.PaidAt,
                    In = x.Direction == PaymentDirectionEnum.IN ? x.Amount : 0,
                    Out = x.Direction == PaymentDirectionEnum.OUT ? x.Amount : 0,
                    PaymentDetailId = x.Id,
                    PaymentType = x.Type,
                    SaleId = x.SaleId,
                    PurchaseId = x.PurchaseId,
                    InvoiceNumber = x.Sale != null ? x.Sale.InvoiceNumber : x.Purchase != null ? x.Purchase.InvoiceNumber : null,
                    CustomerId = x.Sale != null ? x.Sale.CustomerId : x.CustomerId,
                    SupplierId = x.Purchase != null ? x.Purchase.SupplierId : x.SupplierId,
                    PartyName = x.Sale != null ? x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName
                        : x.Purchase != null ? x.Purchase.Supplier.CompanyName
                        : x.Customer != null ? x.Customer.FirstName + " " + x.Customer.LastName
                        : x.Supplier != null ? x.Supplier.CompanyName : null,
                    IsOnAccount = x.SaleId == null && x.PurchaseId == null,
                    Reference = x.CheckNumber ?? x.TransferRef,
                    Description = x.Description,
                })
                .ToListAsync(cancellationToken);

            var transfers = await context.BankAccountTransfers.AsNoTracking()
                .Where(x => (x.FromBankAccountId == accountId || x.ToBankAccountId == accountId) && x.VoidedAt == null)
                .Where(x => (from == null || x.TransferredAt >= from) && (to == null || x.TransferredAt < to))
                .Select(x => new BankAccountMovementDto
                {
                    Kind = x.ToBankAccountId == accountId ? BankAccountMovementKindEnum.TRANSFER_IN : BankAccountMovementKindEnum.TRANSFER_OUT,
                    OccurredAt = x.TransferredAt,
                    In = x.ToBankAccountId == accountId ? (decimal)x.Amount : 0,
                    Out = x.FromBankAccountId == accountId ? (decimal)x.Amount : 0,
                    TransferId = x.Id,
                    CounterpartBankAccountId = x.ToBankAccountId == accountId ? x.FromBankAccountId : x.ToBankAccountId,
                    CounterpartBankAccountTitle = x.ToBankAccountId == accountId ? x.FromBankAccount.Title : x.ToBankAccount.Title,
                    Reference = x.TransferRef,
                    Description = x.Description,
                })
                .ToListAsync(cancellationToken);

            var returnMoney = (await ReturnMoneyAsync(context, q => q.Where(x => x.AccountId == accountId
                    && (from == null || x.OccurredAt >= from) && (to == null || x.OccurredAt < to)), cancellationToken))
                .Select(x => new BankAccountMovementDto
                {
                    Kind = BankAccountMovementKindEnum.RETURN_MONEY,
                    OccurredAt = x.OccurredAt,
                    In = x.IsIn ? x.Amount : 0,
                    Out = x.IsIn ? 0 : x.Amount,
                    PurchaseReturnId = x.IsPurchase ? x.ReturnId : null,
                    SaleReturnId = x.IsPurchase ? null : x.ReturnId,
                    ReturnNumber = x.ReturnNumber,
                    ReturnEffectId = x.EffectId,
                    PurchaseId = x.IsPurchase ? x.DocumentId : null,
                    SaleId = x.IsPurchase ? null : x.DocumentId,
                    InvoiceNumber = x.InvoiceNumber,
                    SupplierId = x.IsPurchase ? x.PartyId : null,
                    CustomerId = x.IsPurchase ? null : x.PartyId,
                    PartyName = x.PartyName,
                    Reference = x.Reference,
                });

            return payments.Concat(transfers).Concat(returnMoney)
                .OrderBy(x => x.OccurredAt)
                .ThenBy(x => x.PaymentDetailId ?? 0)
                .ThenBy(x => x.TransferId ?? 0)
                .ThenBy(x => x.ReturnEffectId ?? 0)
                .ToList();
        }

        /// <summary>
        /// One applied piece of return money in a named account: a non-MIXED money effect with a BankAccountId, or a part of a
        /// MIXED one. MONEY_IN adds, MONEY_OUT subtracts, on the effect's AppliedAt. Pending effects and soft-deleted returns
        /// are in no balance.
        /// </summary>
        private sealed class ReturnMoneyRow
        {
            public int AccountId { get; set; }
            public bool IsIn { get; set; }
            public decimal Amount { get; set; }
            public DateTime OccurredAt { get; set; }
            public bool IsPurchase { get; set; }
            public int ReturnId { get; set; }
            public string ReturnNumber { get; set; } = string.Empty;
            public int EffectId { get; set; }
            public int DocumentId { get; set; }
            public string? InvoiceNumber { get; set; }
            public int PartyId { get; set; }
            public string? PartyName { get; set; }
            public string? Reference { get; set; }
        }

        /// <summary>
        /// The four sources of return money (each return side's effects and their MIXED parts), each filtered by
        /// <paramref name="filter"/> in SQL and read separately - a union of four projections followed by a grouping does not
        /// translate reliably, and these rows are few.
        /// </summary>
        private static async Task<List<ReturnMoneyRow>> ReturnMoneyAsync(IWMSDbContext context, Func<IQueryable<ReturnMoneyRow>, IQueryable<ReturnMoneyRow>> filter, CancellationToken cancellationToken)
        {
            var purchaseEffects = context.PurchaseReturnEffects.AsNoTracking()
                .Where(e => e.BankAccountId != null && e.Status == ReturnEffectStatusEnum.APPLIED && e.AppliedAt != null
                    && (e.Direction == ReturnEffectDirectionEnum.MONEY_IN || e.Direction == ReturnEffectDirectionEnum.MONEY_OUT)
                    && e.PurchaseReturnResolution!.PurchaseReturnClaim!.PurchaseReturn!.IsActive)
                .Select(e => new ReturnMoneyRow
                {
                    AccountId = e.BankAccountId!.Value,
                    IsIn = e.Direction == ReturnEffectDirectionEnum.MONEY_IN,
                    Amount = (decimal)e.Amount!.Value,
                    OccurredAt = e.AppliedAt!.Value,
                    IsPurchase = true,
                    ReturnId = e.PurchaseReturnResolution!.PurchaseReturnClaim!.PurchaseReturnId,
                    ReturnNumber = e.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn!.ReturnNumber,
                    EffectId = e.Id,
                    DocumentId = e.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn.PurchaseId,
                    InvoiceNumber = e.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn.Purchase!.InvoiceNumber,
                    PartyId = e.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn.Purchase.SupplierId,
                    PartyName = e.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn.Purchase.Supplier.CompanyName,
                    Reference = e.Reference,
                });

            var purchaseParts = context.PurchaseReturnEffectMoneyParts.AsNoTracking()
                .Where(p => p.BankAccountId != null && p.PurchaseReturnEffect!.Status == ReturnEffectStatusEnum.APPLIED && p.PurchaseReturnEffect.AppliedAt != null
                    && p.PurchaseReturnEffect.PurchaseReturnResolution!.PurchaseReturnClaim!.PurchaseReturn!.IsActive)
                .Select(p => new ReturnMoneyRow
                {
                    AccountId = p.BankAccountId!.Value,
                    IsIn = p.PurchaseReturnEffect!.Direction == ReturnEffectDirectionEnum.MONEY_IN,
                    Amount = (decimal)p.Amount,
                    OccurredAt = p.PurchaseReturnEffect.AppliedAt!.Value,
                    IsPurchase = true,
                    ReturnId = p.PurchaseReturnEffect.PurchaseReturnResolution!.PurchaseReturnClaim!.PurchaseReturnId,
                    ReturnNumber = p.PurchaseReturnEffect.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn!.ReturnNumber,
                    EffectId = p.PurchaseReturnEffectId,
                    DocumentId = p.PurchaseReturnEffect.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn.PurchaseId,
                    InvoiceNumber = p.PurchaseReturnEffect.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn.Purchase!.InvoiceNumber,
                    PartyId = p.PurchaseReturnEffect.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn.Purchase.SupplierId,
                    PartyName = p.PurchaseReturnEffect.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn.Purchase.Supplier.CompanyName,
                    Reference = p.TransferRef ?? p.CheckNumber,
                });

            var saleEffects = context.SaleReturnEffects.AsNoTracking()
                .Where(e => e.BankAccountId != null && e.Status == ReturnEffectStatusEnum.APPLIED && e.AppliedAt != null
                    && (e.Direction == ReturnEffectDirectionEnum.MONEY_IN || e.Direction == ReturnEffectDirectionEnum.MONEY_OUT)
                    && e.SaleReturnResolution!.SaleReturnClaim!.SaleReturn!.IsActive)
                .Select(e => new ReturnMoneyRow
                {
                    AccountId = e.BankAccountId!.Value,
                    IsIn = e.Direction == ReturnEffectDirectionEnum.MONEY_IN,
                    Amount = (decimal)e.Amount!.Value,
                    OccurredAt = e.AppliedAt!.Value,
                    IsPurchase = false,
                    ReturnId = e.SaleReturnResolution!.SaleReturnClaim!.SaleReturnId,
                    ReturnNumber = e.SaleReturnResolution.SaleReturnClaim.SaleReturn!.ReturnNumber,
                    EffectId = e.Id,
                    DocumentId = e.SaleReturnResolution.SaleReturnClaim.SaleReturn.SaleId,
                    InvoiceNumber = e.SaleReturnResolution.SaleReturnClaim.SaleReturn.Sale!.InvoiceNumber,
                    PartyId = e.SaleReturnResolution.SaleReturnClaim.SaleReturn.Sale.CustomerId,
                    PartyName = e.SaleReturnResolution.SaleReturnClaim.SaleReturn.Sale.Customer.FirstName + " " + e.SaleReturnResolution.SaleReturnClaim.SaleReturn.Sale.Customer.LastName,
                    Reference = e.Reference,
                });

            var saleParts = context.SaleReturnEffectMoneyParts.AsNoTracking()
                .Where(p => p.BankAccountId != null && p.SaleReturnEffect!.Status == ReturnEffectStatusEnum.APPLIED && p.SaleReturnEffect.AppliedAt != null
                    && p.SaleReturnEffect.SaleReturnResolution!.SaleReturnClaim!.SaleReturn!.IsActive)
                .Select(p => new ReturnMoneyRow
                {
                    AccountId = p.BankAccountId!.Value,
                    IsIn = p.SaleReturnEffect!.Direction == ReturnEffectDirectionEnum.MONEY_IN,
                    Amount = (decimal)p.Amount,
                    OccurredAt = p.SaleReturnEffect.AppliedAt!.Value,
                    IsPurchase = false,
                    ReturnId = p.SaleReturnEffect.SaleReturnResolution!.SaleReturnClaim!.SaleReturnId,
                    ReturnNumber = p.SaleReturnEffect.SaleReturnResolution.SaleReturnClaim.SaleReturn!.ReturnNumber,
                    EffectId = p.SaleReturnEffectId,
                    DocumentId = p.SaleReturnEffect.SaleReturnResolution.SaleReturnClaim.SaleReturn.SaleId,
                    InvoiceNumber = p.SaleReturnEffect.SaleReturnResolution.SaleReturnClaim.SaleReturn.Sale!.InvoiceNumber,
                    PartyId = p.SaleReturnEffect.SaleReturnResolution.SaleReturnClaim.SaleReturn.Sale.CustomerId,
                    PartyName = p.SaleReturnEffect.SaleReturnResolution.SaleReturnClaim.SaleReturn.Sale.Customer.FirstName + " " + p.SaleReturnEffect.SaleReturnResolution.SaleReturnClaim.SaleReturn.Sale.Customer.LastName,
                    Reference = p.TransferRef ?? p.CheckNumber,
                });

            var rows = new List<ReturnMoneyRow>();
            foreach (var source in new[] { purchaseEffects, purchaseParts, saleEffects, saleParts })
                rows.AddRange(await filter(source).ToListAsync(cancellationToken));
            return rows;
        }

        /// <summary>Payment rows that count in an account: not voided, and a cheque only once cashed.</summary>
        private static IQueryable<PaymentDetail> Counted(IQueryable<PaymentDetail> rows) =>
            rows.Where(x => x.VoidedAt == null && (x.Type != PaymentTypeEnum.CHECK || x.CheckStatus == PaymentCheckStatusEnum.CASHED));

        /// <summary>[from, to) as the accounting pages read a day range: both days inclusive.</summary>
        public static (DateTime? From, DateTime? To) Range(DateTime? fromDate, DateTime? toDate) =>
            (DateRange.Start(fromDate), DateRange.EndExclusive(toDate));
    }
}
