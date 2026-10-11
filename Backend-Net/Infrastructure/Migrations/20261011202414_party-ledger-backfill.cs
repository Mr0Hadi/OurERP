using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// Data only, no schema change. Writes the party-ledger rows that documents created before the ledger existed
    /// (migration 20260924222250_party-ledger, which deliberately started the ledger empty) never got, so customer and
    /// supplier balances cover the whole history. The rules are PartyLedger's, applied to the state the data is in now:
    ///
    ///   issued sale (not PROFORMA/CANCELLED, active)          customer DEBIT  TotalAmount        at InvoiceDate
    ///   installment charge of a live plan on such a sale      customer DEBIT  the charge         at the plan's CreatedAt
    ///   recorded purchase (not PROFORMA/CANCELLED, active)    supplier CREDIT TotalAmount        at InvoiceDate
    ///                                                         (minus supplement rows already written live - TotalAmount includes them)
    ///   line still closed short on such a purchase            supplier DEBIT  its share          at ShortClosedAt
    ///   non-voided payment on an active sale/purchase         IN = CREDIT, OUT = DEBIT          at PaidAt
    ///   applied return money settled ON_ACCOUNT (or the       MONEY_IN = DEBIT, MONEY_OUT = CREDIT at AppliedAt
    ///   ON_ACCOUNT parts of MIXED) on an active return
    ///
    /// Collapsed history is written as its net result: a cancelled invoice, a voided payment, a removed plan or a reopened
    /// line gets nothing (row + reversal = nothing). Idempotent: every block skips what the ledger already has - a document,
    /// payment, line or claim that was handled live is never written twice, so running it against a database where the
    /// ledger has been live for a while only fills the gaps. Every row carries the «(ثبت تکمیلی)» marker in Description.
    /// </summary>
    public partial class partyledgerbackfill : Migration
    {
        private const string Marker = "N' (ثبت تکمیلی)'";

        /// <summary>The statements Up runs, in order. Public so the integration test can replay them against the live
        /// ledger code (PartyLedgerBackfillTests).</summary>
        public static readonly IReadOnlyList<string> UpStatements = new[]
        {
            // Sale invoices.
            $@"
INSERT INTO PartyLedgerEntries (CustomerId, Direction, Amount, EntryType, OccurredAt, CreatedAt, SaleId, Description)
SELECT s.CustomerId, 1, s.TotalAmount, 1, COALESCE(s.InvoiceDate, s.CreatedAt), GETDATE(), s.Id,
       LEFT(N'فاکتور فروش ' + s.InvoiceNumber + {Marker}, 200)
FROM Sales s
WHERE s.IsActive = 1 AND s.Status NOT IN (0, 5) AND s.TotalAmount > 0
  AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries e WHERE e.SaleId = s.Id AND e.EntryType = 1);",
            // Installment charges of live plans on issued sales.
            $@"
INSERT INTO PartyLedgerEntries (CustomerId, Direction, Amount, EntryType, OccurredAt, CreatedAt, SaleId, Description)
SELECT s.CustomerId, 1, p.InstallmentChargeAmount, 4, p.CreatedAt, GETDATE(), s.Id,
       LEFT(N'سود اقساط فاکتور ' + s.InvoiceNumber + {Marker}, 200)
FROM SaleInstallmentPlans p
JOIN Sales s ON s.Id = p.SaleId
WHERE p.IsActive = 1 AND p.InstallmentChargeAmount > 0
  AND s.IsActive = 1 AND s.Status NOT IN (0, 5)
  AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries e WHERE e.SaleId = s.Id AND e.EntryType = 4);",
            // Purchase invoices. TotalAmount already includes supplement lines; a supplement written live is taken off so
            // it is not counted twice.
            $@"
INSERT INTO PartyLedgerEntries (SupplierId, Direction, Amount, EntryType, OccurredAt, CreatedAt, PurchaseId, Description)
SELECT x.SupplierId, 2, x.Amount, 2, x.OccurredAt, GETDATE(), x.Id, LEFT(N'فاکتور خرید ' + x.InvoiceNumber + {Marker}, 200)
FROM (
    SELECT p.Id, p.SupplierId, p.InvoiceNumber, COALESCE(p.InvoiceDate, p.CreatedAt) AS OccurredAt,
           p.TotalAmount - COALESCE((
               SELECT SUM(e.Amount) FROM PartyLedgerEntries e
               WHERE e.PurchaseId = p.Id AND e.EntryType = 3
                 AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries r WHERE r.ReversalOfEntryId = e.Id)), 0) AS Amount
    FROM Purchases p
    WHERE p.IsActive = 1 AND p.Status NOT IN (0, 5)
      AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries e WHERE e.PurchaseId = p.Id AND e.EntryType = 2)
) x
WHERE x.Amount > 0;",
            // Lines still closed short: the share InvoiceLineMath.ShareOfTotal computes (ROUND is half away from zero here).
            $@"
INSERT INTO PartyLedgerEntries (SupplierId, Direction, Amount, EntryType, OccurredAt, CreatedAt, PurchaseId, PurchaseItemId, Description)
SELECT x.SupplierId, 1, x.Amount, 8, x.OccurredAt, GETDATE(), x.PurchaseId, x.ItemId,
       LEFT(N'کسری ' + CAST(x.ShortClosedQuantity AS nvarchar(20)) + N' عدد، فاکتور خرید ' + x.InvoiceNumber + {Marker}, 200)
FROM (
    SELECT i.Id AS ItemId, i.PurchaseId, i.ShortClosedQuantity, p.SupplierId, p.InvoiceNumber,
           COALESCE(i.ShortClosedAt, p.InvoiceDate, p.CreatedAt) AS OccurredAt,
           ROUND(CAST(i.TotalAmount AS decimal(38, 6)) * i.ShortClosedQuantity / i.Quantity, 0) AS Amount
    FROM PurchaseItems i
    JOIN Purchases p ON p.Id = i.PurchaseId
    WHERE i.ShortClosedQuantity > 0 AND i.Quantity > 0
      AND p.IsActive = 1 AND p.Status NOT IN (0, 5)
      AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries e
                      WHERE e.PurchaseItemId = i.Id AND e.EntryType = 8
                        AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries r WHERE r.ReversalOfEntryId = e.Id))
) x
WHERE x.Amount > 0;",
            // Payments on sales (IN = the customer paid: CREDIT; OUT = a refund: DEBIT).
            $@"
INSERT INTO PartyLedgerEntries (CustomerId, Direction, Amount, EntryType, OccurredAt, CreatedAt, SaleId, PaymentDetailId, Description)
SELECT s.CustomerId, CASE WHEN pd.Direction = 1 THEN 2 ELSE 1 END, FLOOR(pd.Amount), 5, pd.PaidAt, GETDATE(), s.Id, pd.Id,
       LEFT(RTRIM(N'پرداخت فاکتور فروش ' + s.InvoiceNumber) + {Marker}, 200)
FROM PaymentDetails pd
JOIN Sales s ON s.Id = pd.SaleId
WHERE pd.VoidedAt IS NULL AND FLOOR(pd.Amount) > 0 AND s.IsActive = 1
  AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries e WHERE e.PaymentDetailId = pd.Id);",
            // Payments on purchases (OUT = we paid: DEBIT; IN = a supplier refund: CREDIT). A prepayment on a proforma
            // counts - that money did move.
            $@"
INSERT INTO PartyLedgerEntries (SupplierId, Direction, Amount, EntryType, OccurredAt, CreatedAt, PurchaseId, PaymentDetailId, Description)
SELECT p.SupplierId, CASE WHEN pd.Direction = 1 THEN 2 ELSE 1 END, FLOOR(pd.Amount), 5, pd.PaidAt, GETDATE(), p.Id, pd.Id,
       LEFT(RTRIM(N'پرداخت فاکتور خرید ' + p.InvoiceNumber) + {Marker}, 200)
FROM PaymentDetails pd
JOIN Purchases p ON p.Id = pd.PurchaseId
WHERE pd.VoidedAt IS NULL AND FLOOR(pd.Amount) > 0 AND p.IsActive = 1
  AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries e WHERE e.PaymentDetailId = pd.Id);",
            // Sale-return money settled on account. Direction: MONEY_IN (3) = DEBIT, MONEY_OUT (2) = CREDIT.
            // Method: ON_ACCOUNT = 1, MIXED = 4 (its ON_ACCOUNT parts).
            $@"
INSERT INTO PartyLedgerEntries (CustomerId, Direction, Amount, EntryType, OccurredAt, CreatedAt, SaleId, SaleReturnClaimId, Description)
SELECT x.CustomerId, x.Side, x.Amount, 6, x.OccurredAt, GETDATE(), x.SaleId, x.ClaimId, LEFT(N'مرجوعی فروش ' + x.ReturnNumber + {Marker}, 200)
FROM (
    SELECT s.CustomerId, s.Id AS SaleId, c.Id AS ClaimId, r.ReturnNumber,
           CASE WHEN ef.Direction = 3 THEN 1 ELSE 2 END AS Side,
           COALESCE(ef.AppliedAt, ef.CreatedAt) AS OccurredAt,
           CASE WHEN ef.Method = 1 THEN COALESCE(ef.Amount, 0)
                ELSE COALESCE((SELECT SUM(mp.Amount) FROM SaleReturnEffectMoneyParts mp
                               WHERE mp.SaleReturnEffectId = ef.Id AND mp.Method = 1), 0) END AS Amount
    FROM SaleReturnEffects ef
    JOIN SaleReturnResolutions res ON res.Id = ef.SaleReturnResolutionId
    JOIN SaleReturnClaims c ON c.Id = res.SaleReturnClaimId
    JOIN SaleReturns r ON r.Id = c.SaleReturnId
    JOIN Sales s ON s.Id = r.SaleId
    WHERE ef.Status = 1 AND ef.Direction IN (2, 3) AND ef.Method IN (1, 4) AND r.IsActive = 1
      AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries e WHERE e.SaleReturnClaimId = c.Id AND e.EntryType = 6)
) x
WHERE x.Amount > 0;",
            // Purchase-return money settled on account, the same way.
            $@"
INSERT INTO PartyLedgerEntries (SupplierId, Direction, Amount, EntryType, OccurredAt, CreatedAt, PurchaseId, PurchaseReturnClaimId, Description)
SELECT x.SupplierId, x.Side, x.Amount, 6, x.OccurredAt, GETDATE(), x.PurchaseId, x.ClaimId, LEFT(N'مرجوعی خرید ' + x.ReturnNumber + {Marker}, 200)
FROM (
    SELECT p.SupplierId, p.Id AS PurchaseId, c.Id AS ClaimId, r.ReturnNumber,
           CASE WHEN ef.Direction = 3 THEN 1 ELSE 2 END AS Side,
           COALESCE(ef.AppliedAt, ef.CreatedAt) AS OccurredAt,
           CASE WHEN ef.Method = 1 THEN COALESCE(ef.Amount, 0)
                ELSE COALESCE((SELECT SUM(mp.Amount) FROM PurchaseReturnEffectMoneyParts mp
                               WHERE mp.PurchaseReturnEffectId = ef.Id AND mp.Method = 1), 0) END AS Amount
    FROM PurchaseReturnEffects ef
    JOIN PurchaseReturnResolutions res ON res.Id = ef.PurchaseReturnResolutionId
    JOIN PurchaseReturnClaims c ON c.Id = res.PurchaseReturnClaimId
    JOIN PurchaseReturns r ON r.Id = c.PurchaseReturnId
    JOIN Purchases p ON p.Id = r.PurchaseId
    WHERE ef.Status = 1 AND ef.Direction IN (2, 3) AND ef.Method IN (1, 4) AND r.IsActive = 1
      AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries e WHERE e.PurchaseReturnClaimId = c.Id AND e.EntryType = 6)
) x
WHERE x.Amount > 0;",
        };

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var sql in UpStatements)
                migrationBuilder.Sql(sql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Removes the backfilled rows that nothing has taken back since. A row a later REVERSAL points at is part of
            // the live history now and stays (its foreign key would refuse the delete anyway).
            migrationBuilder.Sql($@"
DELETE e FROM PartyLedgerEntries e
WHERE e.Description LIKE N'%' + {Marker}
  AND NOT EXISTS (SELECT 1 FROM PartyLedgerEntries r WHERE r.ReversalOfEntryId = e.Id);");
        }
    }
}
