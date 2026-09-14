using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class receivingquarantine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CustodyReason",
                table: "ProductUnits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PurchaseId",
                table: "ProductUnits",
                type: "int",
                nullable: true);

            // Backfill: every existing unit that came in on a purchase line is on-order custody of that purchase.
            // Units with no line (opening balance, manual adjustment, customer returns without a line) stay null.
            migrationBuilder.Sql(@"
UPDATE pu
SET pu.PurchaseId = pi.PurchaseId,
    pu.CustodyReason = 1
FROM ProductUnits pu
INNER JOIN PurchaseItems pi ON pi.Id = pu.PurchaseItemId
WHERE pu.PurchaseItemId IS NOT NULL;");

            migrationBuilder.AddColumn<bool>(
                name: "IsIncomplete",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresUnitTracking",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "OffPoolValueDelta",
                table: "InventoryCostLedgerEntries",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "PurchaseReceivingDiscrepancies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseId = table.Column<int>(type: "int", nullable: false),
                    PurchaseItemId = table.Column<int>(type: "int", nullable: true),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    CustodyReason = table.Column<int>(type: "int", nullable: false),
                    Problem = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReceivingDiscrepancies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReceivingDiscrepancies_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseReceivingDiscrepancies_Purchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "Purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductUnits_PurchaseId_Status_CustodyReason",
                table: "ProductUnits",
                columns: new[] { "PurchaseId", "Status", "CustodyReason" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReceivingDiscrepancies_ProductId",
                table: "PurchaseReceivingDiscrepancies",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReceivingDiscrepancies_PurchaseId",
                table: "PurchaseReceivingDiscrepancies",
                column: "PurchaseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseReceivingDiscrepancies");

            migrationBuilder.DropIndex(
                name: "IX_ProductUnits_PurchaseId_Status_CustodyReason",
                table: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "CustodyReason",
                table: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "PurchaseId",
                table: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "IsIncomplete",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "RequiresUnitTracking",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "OffPoolValueDelta",
                table: "InventoryCostLedgerEntries");
        }
    }
}
