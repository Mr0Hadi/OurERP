using Application.Common.Contracts.Context;
using Application.Features.Accounting.Dtos;
using Domain.Enums;

namespace Application.Features.Accounting
{
    /// <summary>
    /// Every customer and supplier with their party-ledger totals, as one queryable (UNION ALL of the two sides) - the
    /// source of the party balance table, its export and the dashboard's receivable/payable figures. The ledger totals
    /// are correlated subqueries (backed by the (CustomerId, OccurredAt) / (SupplierId, OccurredAt) indexes), so the
    /// result can be filtered and sorted on them in SQL. Inactive parties are kept while they have ledger rows: a deactivated customer can still owe money.
    /// </summary>
    public static class PartyBalances
    {
        public static IQueryable<PartyBalanceRowDto> Rows(IWMSDbContext context, AccountingPartyTypeEnum? partyType = null)
        {
            var ledger = context.PartyLedgerEntries;

            var customers = context.Customers
                .Where(c => c.IsActive || ledger.Any(e => e.CustomerId == c.Id))
                .Select(c => new PartyBalanceRowDto
                {
                    PartyType = AccountingPartyTypeEnum.CUSTOMER,
                    PartyId = c.Id,
                    Name = c.FirstName + " " + c.LastName,
                    Phone = c.PhoneNumber,
                    IsActive = c.IsActive,
                    CreditLimit = (decimal?)c.CreditLimit,
                    TotalDebit = ledger.Where(e => e.CustomerId == c.Id && e.Direction == PartyLedgerDirectionEnum.DEBIT).Sum(e => (decimal)e.Amount),
                    TotalCredit = ledger.Where(e => e.CustomerId == c.Id && e.Direction == PartyLedgerDirectionEnum.CREDIT).Sum(e => (decimal)e.Amount),
                    Balance = ledger.Where(e => e.CustomerId == c.Id)
                        .Sum(e => e.Direction == PartyLedgerDirectionEnum.DEBIT ? (decimal)e.Amount : -(decimal)e.Amount),
                    LastEntryAt = ledger.Where(e => e.CustomerId == c.Id).Max(e => (DateTime?)e.OccurredAt),
                    LastPaymentAt = ledger.Where(e => e.CustomerId == c.Id && e.EntryType == PartyLedgerEntryTypeEnum.PAYMENT).Max(e => (DateTime?)e.OccurredAt),
                });

            var suppliers = context.Suppliers
                .Where(s => s.IsActive || ledger.Any(e => e.SupplierId == s.Id))
                .Select(s => new PartyBalanceRowDto
                {
                    PartyType = AccountingPartyTypeEnum.SUPPLIER,
                    PartyId = s.Id,
                    Name = s.CompanyName,
                    Phone = s.Phone,
                    IsActive = s.IsActive,
                    CreditLimit = null,
                    TotalDebit = ledger.Where(e => e.SupplierId == s.Id && e.Direction == PartyLedgerDirectionEnum.DEBIT).Sum(e => (decimal)e.Amount),
                    TotalCredit = ledger.Where(e => e.SupplierId == s.Id && e.Direction == PartyLedgerDirectionEnum.CREDIT).Sum(e => (decimal)e.Amount),
                    Balance = ledger.Where(e => e.SupplierId == s.Id)
                        .Sum(e => e.Direction == PartyLedgerDirectionEnum.DEBIT ? (decimal)e.Amount : -(decimal)e.Amount),
                    LastEntryAt = ledger.Where(e => e.SupplierId == s.Id).Max(e => (DateTime?)e.OccurredAt),
                    LastPaymentAt = ledger.Where(e => e.SupplierId == s.Id && e.EntryType == PartyLedgerEntryTypeEnum.PAYMENT).Max(e => (DateTime?)e.OccurredAt),
                });

            return partyType switch
            {
                AccountingPartyTypeEnum.CUSTOMER => customers,
                AccountingPartyTypeEnum.SUPPLIER => suppliers,
                _ => customers.Concat(suppliers),
            };
        }
    }
}
