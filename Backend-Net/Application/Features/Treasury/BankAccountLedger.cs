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
    /// it (IN adds, OUT subtracts) and every non-voided transfer between our accounts. Nothing stores a running balance; it is
    /// always summed from these, so it cannot drift from the rows. Read-side only.
    /// </summary>
    public static class BankAccountLedger
    {
        /// <summary>Net movement (without the opening balance) per account, optionally only before <paramref name="before"/>.</summary>
        public static async Task<Dictionary<int, decimal>> NetMovementsAsync(IWMSDbContext context, IReadOnlyCollection<int> accountIds, DateTime? before, CancellationToken cancellationToken)
        {
            var payments = await context.PaymentDetails.AsNoTracking()
                .Where(x => x.BankAccountId != null && accountIds.Contains(x.BankAccountId.Value) && x.VoidedAt == null)
                .Where(x => before == null || x.PaidAt < before)
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
            foreach (var t in transfersIn)
                net[t.AccountId] += t.Total;
            foreach (var t in transfersOut)
                net[t.AccountId] -= t.Total;
            return net;
        }

        /// <summary>Money recorded with no account: net IN minus OUT of the non-voided payment rows without a BankAccountId.</summary>
        public static async Task<decimal> UnassignedNetAsync(IWMSDbContext context, CancellationToken cancellationToken)
        {
            var sides = await context.PaymentDetails.AsNoTracking()
                .Where(x => x.BankAccountId == null && x.VoidedAt == null && x.Type != PaymentTypeEnum.CREDIT)
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
            var payments = await context.PaymentDetails.AsNoTracking()
                .Where(x => x.BankAccountId == accountId && x.VoidedAt == null)
                .Where(x => (from == null || x.PaidAt >= from) && (to == null || x.PaidAt < to))
                .Select(x => new BankAccountMovementDto
                {
                    Kind = BankAccountMovementKindEnum.PAYMENT,
                    OccurredAt = x.PaidAt,
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

            return payments.Concat(transfers)
                .OrderBy(x => x.OccurredAt)
                .ThenBy(x => x.PaymentDetailId ?? 0)
                .ThenBy(x => x.TransferId ?? 0)
                .ToList();
        }

        /// <summary>[from, to) as the accounting pages read a day range: both days inclusive.</summary>
        public static (DateTime? From, DateTime? To) Range(DateTime? fromDate, DateTime? toDate) =>
            (DateRange.Start(fromDate), DateRange.EndExclusive(toDate));
    }
}
