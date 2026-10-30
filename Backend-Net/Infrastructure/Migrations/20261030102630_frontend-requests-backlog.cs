using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// Frontend requests backlog (docs/frontend-requests.fa.md, CLAUDE.md "Frontend requests backlog, 2026-10-30"). Schema:
    /// the Customers.ReferralCode spelling, Users.DashboardLayout, the replacement counters on both order lines, the
    /// DocumentNumberCounters table and unique indexes on the official document numbers. Data, in Up only:
    /// <list type="number">
    /// <item>Duplicate invoice/return numbers (drawn as "row count + 1") are renumbered before the unique indexes: the lowest Id
    /// keeps its number, every later duplicate gets the next free number of its kind.</item>
    /// <item>Each counter starts from the highest number already issued, so new numbers continue the sequence.</item>
    /// <item>Optional dates stored as 0001-01-01 become NULL.</item>
    /// <item>Every customer/supplier with a typed opening balance gets its OPENING_BALANCE ledger row (skipped when it has one).</item>
    /// <item>Shelf codes are rewritten without leading zeros in their numeric segments (BinLocations.Normalize).</item>
    /// </list>
    /// </summary>
    public partial class frontendrequestsbacklog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "RefferalCode",
                table: "Customers",
                newName: "ReferralCode");

            migrationBuilder.AddColumn<string>(
                name: "DashboardLayout",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "InvoiceNumber",
                table: "Sales",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "ReturnNumber",
                table: "SaleReturns",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<int>(
                name: "ReplacementShippedQuantity",
                table: "SaleItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "ReturnNumber",
                table: "PurchaseReturns",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<int>(
                name: "ReplacementReceivedQuantity",
                table: "PurchaseItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "DocumentNumberCounters",
                columns: table => new
                {
                    Key = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LastValue = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentNumberCounters", x => x.Key);
                });

            // ---- Data (see the class summary) ----
            migrationBuilder.Sql(@"
DECLARE @max int = ISNULL((SELECT MAX(TRY_CAST(RIGHT([InvoiceNumber], CHARINDEX('-', REVERSE([InvoiceNumber])) - 1) AS int))
                           FROM [Sales] WHERE CHARINDEX('-', [InvoiceNumber]) > 0), 0);
WITH d AS (SELECT [Id], ROW_NUMBER() OVER (PARTITION BY [InvoiceNumber] ORDER BY [Id]) AS rn FROM [Sales] WHERE [InvoiceNumber] <> ''),
     r AS (SELECT [Id], ROW_NUMBER() OVER (ORDER BY [Id]) AS k FROM d WHERE rn > 1)
UPDATE t SET [InvoiceNumber] = CONCAT('INV-', YEAR(ISNULL(t.[InvoiceDate], t.[CreatedAt])), '-', FORMAT(@max + r.k, 'D4'))
FROM [Sales] t JOIN r ON r.[Id] = t.[Id];");

            migrationBuilder.Sql(@"
DECLARE @max int = ISNULL((SELECT MAX(TRY_CAST(RIGHT([ReturnNumber], CHARINDEX('-', REVERSE([ReturnNumber])) - 1) AS int))
                           FROM [PurchaseReturns] WHERE CHARINDEX('-', [ReturnNumber]) > 0), 0);
WITH d AS (SELECT [Id], ROW_NUMBER() OVER (PARTITION BY [ReturnNumber] ORDER BY [Id]) AS rn FROM [PurchaseReturns] WHERE [ReturnNumber] <> ''),
     r AS (SELECT [Id], ROW_NUMBER() OVER (ORDER BY [Id]) AS k FROM d WHERE rn > 1)
UPDATE t SET [ReturnNumber] = CONCAT('RET-', YEAR(t.[ReturnDate]), '-', FORMAT(@max + r.k, 'D4'))
FROM [PurchaseReturns] t JOIN r ON r.[Id] = t.[Id];");

            migrationBuilder.Sql(@"
DECLARE @max int = ISNULL((SELECT MAX(TRY_CAST(RIGHT([ReturnNumber], CHARINDEX('-', REVERSE([ReturnNumber])) - 1) AS int))
                           FROM [SaleReturns] WHERE CHARINDEX('-', [ReturnNumber]) > 0), 0);
WITH d AS (SELECT [Id], ROW_NUMBER() OVER (PARTITION BY [ReturnNumber] ORDER BY [Id]) AS rn FROM [SaleReturns] WHERE [ReturnNumber] <> ''),
     r AS (SELECT [Id], ROW_NUMBER() OVER (ORDER BY [Id]) AS k FROM d WHERE rn > 1)
UPDATE t SET [ReturnNumber] = CONCAT('SRET-', YEAR(t.[ReturnDate]), '-', FORMAT(@max + r.k, 'D4'))
FROM [SaleReturns] t JOIN r ON r.[Id] = t.[Id];");

            migrationBuilder.Sql(@"
INSERT INTO [DocumentNumberCounters] ([Key], [LastValue])
SELECT N'SaleInvoice', ISNULL(MAX(TRY_CAST(RIGHT([InvoiceNumber], CHARINDEX('-', REVERSE([InvoiceNumber])) - 1) AS int)), 0)
FROM [Sales] WHERE CHARINDEX('-', [InvoiceNumber]) > 0;");

            migrationBuilder.Sql(@"
INSERT INTO [DocumentNumberCounters] ([Key], [LastValue])
SELECT N'PurchaseReturn', ISNULL(MAX(TRY_CAST(RIGHT([ReturnNumber], CHARINDEX('-', REVERSE([ReturnNumber])) - 1) AS int)), 0)
FROM [PurchaseReturns] WHERE CHARINDEX('-', [ReturnNumber]) > 0;");

            migrationBuilder.Sql(@"
INSERT INTO [DocumentNumberCounters] ([Key], [LastValue])
SELECT N'SaleReturn', ISNULL(MAX(TRY_CAST(RIGHT([ReturnNumber], CHARINDEX('-', REVERSE([ReturnNumber])) - 1) AS int)), 0)
FROM [SaleReturns] WHERE CHARINDEX('-', [ReturnNumber]) > 0;");

            migrationBuilder.Sql(@"
INSERT INTO [DocumentNumberCounters] ([Key], [LastValue])
SELECT N'StockTransfer', ISNULL(MAX(TRY_CAST(RIGHT([TransferNumber], CHARINDEX('-', REVERSE([TransferNumber])) - 1) AS int)), 0)
FROM [StockTransfers] WHERE CHARINDEX('-', [TransferNumber]) > 0;");

            migrationBuilder.Sql(@"
INSERT INTO [DocumentNumberCounters] ([Key], [LastValue])
SELECT N'Stocktake', ISNULL(MAX(TRY_CAST(RIGHT([Number], CHARINDEX('-', REVERSE([Number])) - 1) AS int)), 0)
FROM [Stocktakes] WHERE CHARINDEX('-', [Number]) > 0;");

            migrationBuilder.Sql(@"
UPDATE [Purchases] SET [PaymentDate] = NULL WHERE [PaymentDate] < '1900-01-01';
UPDATE [Purchases] SET [InvoiceDate] = NULL WHERE [InvoiceDate] < '1900-01-01';
UPDATE [Sales] SET [PaymentDate] = NULL WHERE [PaymentDate] < '1900-01-01';
UPDATE [Sales] SET [InvoiceDate] = NULL WHERE [InvoiceDate] < '1900-01-01';");

            // BalanceTypeEnum: Creditor = 0, Debtor = 1. Direction: DEBIT = 1, CREDIT = 2. EntryType OPENING_BALANCE = 10.
            migrationBuilder.Sql(@"
INSERT INTO [PartyLedgerEntries] ([CustomerId], [SupplierId], [Direction], [Amount], [EntryType], [OccurredAt], [CreatedAt], [Description])
SELECT c.[Id], NULL, CASE c.[BalanceType] WHEN 1 THEN 1 ELSE 2 END, c.[Balance], 10, c.[CreatedAt], GETDATE(), N'مانده‌ی اول دوره'
FROM [Customers] c
WHERE c.[Balance] > 0 AND c.[BalanceType] IN (0, 1)
  AND NOT EXISTS (SELECT 1 FROM [PartyLedgerEntries] e WHERE e.[CustomerId] = c.[Id] AND e.[EntryType] = 10);
INSERT INTO [PartyLedgerEntries] ([CustomerId], [SupplierId], [Direction], [Amount], [EntryType], [OccurredAt], [CreatedAt], [Description])
SELECT NULL, s.[Id], CASE s.[BalanceType] WHEN 1 THEN 1 ELSE 2 END, s.[Balance], 10, s.[CreatedAt], GETDATE(), N'مانده‌ی اول دوره'
FROM [Suppliers] s
WHERE s.[Balance] > 0 AND s.[BalanceType] IN (0, 1)
  AND NOT EXISTS (SELECT 1 FROM [PartyLedgerEntries] e WHERE e.[SupplierId] = s.[Id] AND e.[EntryType] = 10);");

            // STRING_SPLIT's ordinal argument needs SQL Server 2022+.
            migrationBuilder.Sql(@"
UPDATE u SET [BinLocation] = (
    SELECT STRING_AGG(CASE WHEN p.[value] <> '' AND p.[value] NOT LIKE '%[^0-9]%' AND LEN(p.[value]) <= 18
                           THEN CAST(CAST(p.[value] AS bigint) AS nvarchar(50)) ELSE p.[value] END, '-') WITHIN GROUP (ORDER BY p.[ordinal])
    FROM STRING_SPLIT(u.[BinLocation], '-', 1) p)
FROM [ProductUnits] u
WHERE u.[BinLocation] IS NOT NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_InvoiceNumber",
                table: "Sales",
                column: "InvoiceNumber",
                unique: true,
                filter: "[InvoiceNumber] <> ''");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturns_ReturnNumber",
                table: "SaleReturns",
                column: "ReturnNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturns_ReturnNumber",
                table: "PurchaseReturns",
                column: "ReturnNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DocumentNumberCounters");

            migrationBuilder.DropIndex(
                name: "IX_Sales_InvoiceNumber",
                table: "Sales");

            migrationBuilder.DropIndex(
                name: "IX_SaleReturns_ReturnNumber",
                table: "SaleReturns");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseReturns_ReturnNumber",
                table: "PurchaseReturns");

            migrationBuilder.DropColumn(
                name: "DashboardLayout",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ReplacementShippedQuantity",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "ReplacementReceivedQuantity",
                table: "PurchaseItems");

            migrationBuilder.RenameColumn(
                name: "ReferralCode",
                table: "Customers",
                newName: "RefferalCode");

            migrationBuilder.AlterColumn<string>(
                name: "InvoiceNumber",
                table: "Sales",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "ReturnNumber",
                table: "SaleReturns",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "ReturnNumber",
                table: "PurchaseReturns",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);
        }
    }
}
