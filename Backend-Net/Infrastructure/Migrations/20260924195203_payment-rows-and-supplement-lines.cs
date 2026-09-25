using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// Payment rows get a Direction and VoidedAt; PaidAmount becomes the sum of the rows (DocumentPayments.NetPaid),
    /// and accepted purchase excess becomes supplement lines (IsSupplement / SupplementOfPurchaseItemId).
    /// The backfill makes the new invariant true for existing data at once: every existing row is in its document's
    /// own direction (a sale's IN, a purchase's OUT); a document that has a PaidAmount but no rows - it was typed in
    /// by hand - gets one NORMAL row for that amount dated at the document's creation; then every PaidAmount is
    /// recomputed from its rows. Excess accepted before this migration was merged into its ordered line and is left
    /// as it is - there is no record of which part of the line it was.
    /// </summary>
    public partial class paymentrowsandsupplementlines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSupplement",
                table: "PurchaseItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SupplementOfPurchaseItemId",
                table: "PurchaseItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Direction",
                table: "PaymentDetails",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "VoidedAt",
                table: "PaymentDetails",
                type: "datetime2",
                nullable: true);

            migrationBuilder.Sql("UPDATE [PaymentDetails] SET [Direction] = CASE WHEN [SaleId] IS NOT NULL THEN 1 ELSE 2 END;");

            // PaymentType CASH=0, CREDIT=1, CHECK=2, TRANSFER=3 are single-row methods; anything else is recorded as CASH.
            migrationBuilder.Sql(@"
INSERT INTO [PaymentDetails] ([SaleId], [PurchaseId], [Type], [Purpose], [Direction], [Amount], [PaidAt])
SELECT s.[Id], NULL, CASE WHEN s.[PaymentType] IN (0, 1, 2, 3) THEN s.[PaymentType] ELSE 0 END, 0, 1, s.[PaidAmount], s.[CreatedAt]
FROM [Sales] s
WHERE s.[PaidAmount] > 0 AND NOT EXISTS (SELECT 1 FROM [PaymentDetails] p WHERE p.[SaleId] = s.[Id]);");

            migrationBuilder.Sql(@"
INSERT INTO [PaymentDetails] ([SaleId], [PurchaseId], [Type], [Purpose], [Direction], [Amount], [PaidAt])
SELECT NULL, pu.[Id], CASE WHEN pu.[PaymentType] IN (0, 1, 2, 3) THEN pu.[PaymentType] ELSE 0 END, 0, 2, pu.[PaidAmount], pu.[CreatedAt]
FROM [Purchases] pu
WHERE pu.[PaidAmount] > 0 AND NOT EXISTS (SELECT 1 FROM [PaymentDetails] p WHERE p.[PurchaseId] = pu.[Id]);");

            migrationBuilder.Sql(@"
UPDATE s SET s.[PaidAmount] = COALESCE((SELECT SUM(CASE WHEN p.[Direction] = 1 THEN p.[Amount] ELSE -p.[Amount] END)
                                         FROM [PaymentDetails] p WHERE p.[SaleId] = s.[Id] AND p.[VoidedAt] IS NULL), 0)
FROM [Sales] s;");

            migrationBuilder.Sql(@"
UPDATE pu SET pu.[PaidAmount] = COALESCE((SELECT SUM(CASE WHEN p.[Direction] = 2 THEN p.[Amount] ELSE -p.[Amount] END)
                                           FROM [PaymentDetails] p WHERE p.[PurchaseId] = pu.[Id] AND p.[VoidedAt] IS NULL), 0)
FROM [Purchases] pu;");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseItems_SupplementOfPurchaseItemId",
                table: "PurchaseItems",
                column: "SupplementOfPurchaseItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseItems_PurchaseItems_SupplementOfPurchaseItemId",
                table: "PurchaseItems",
                column: "SupplementOfPurchaseItemId",
                principalTable: "PurchaseItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseItems_PurchaseItems_SupplementOfPurchaseItemId",
                table: "PurchaseItems");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseItems_SupplementOfPurchaseItemId",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "IsSupplement",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "SupplementOfPurchaseItemId",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "Direction",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "VoidedAt",
                table: "PaymentDetails");
        }
    }
}
