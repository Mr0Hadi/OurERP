using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class returnbookedquantityandkeptextras : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CostLedgerEntryId",
                table: "SaleReturnEffects",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsKeptByCustomer",
                table: "SaleReturnEffects",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "BookedQuantity",
                table: "SaleReturnEffectRounds",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BookedQuantity",
                table: "PurchaseReturnEffectRounds",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SaleReturnEffectId",
                table: "ProductUnits",
                type: "int",
                nullable: true);

            // Backfill BookedQuantity from what each existing round actually did. Before this migration every
            // goods round moved recorded stock whatever its claim's scope, so a round's booked quantity is
            // simply what it moved: a purchase GOODS_IN (Direction 0) its healthy, restocked units; every
            // other round its full quantity (a sale GOODS_IN restored or scrapped every unit it took back).
            // The stored sums then start exactly where the old behaviour left Product.Stock.
            migrationBuilder.Sql(@"
UPDATE r
SET r.BookedQuantity = CASE WHEN e.Direction = 0 THEN COALESCE(r.HealthyQuantity, r.Quantity) ELSE r.Quantity END
FROM PurchaseReturnEffectRounds r
INNER JOIN PurchaseReturnEffects e ON e.Id = r.PurchaseReturnEffectId;

UPDATE SaleReturnEffectRounds SET BookedQuantity = Quantity;
");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnEffects_CostLedgerEntryId",
                table: "SaleReturnEffects",
                column: "CostLedgerEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductUnits_SaleReturnEffectId",
                table: "ProductUnits",
                column: "SaleReturnEffectId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductUnits_SaleReturnEffects_SaleReturnEffectId",
                table: "ProductUnits",
                column: "SaleReturnEffectId",
                principalTable: "SaleReturnEffects",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SaleReturnEffects_InventoryCostLedgerEntries_CostLedgerEntryId",
                table: "SaleReturnEffects",
                column: "CostLedgerEntryId",
                principalTable: "InventoryCostLedgerEntries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProductUnits_SaleReturnEffects_SaleReturnEffectId",
                table: "ProductUnits");

            migrationBuilder.DropForeignKey(
                name: "FK_SaleReturnEffects_InventoryCostLedgerEntries_CostLedgerEntryId",
                table: "SaleReturnEffects");

            migrationBuilder.DropIndex(
                name: "IX_SaleReturnEffects_CostLedgerEntryId",
                table: "SaleReturnEffects");

            migrationBuilder.DropIndex(
                name: "IX_ProductUnits_SaleReturnEffectId",
                table: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "CostLedgerEntryId",
                table: "SaleReturnEffects");

            migrationBuilder.DropColumn(
                name: "IsKeptByCustomer",
                table: "SaleReturnEffects");

            migrationBuilder.DropColumn(
                name: "BookedQuantity",
                table: "SaleReturnEffectRounds");

            migrationBuilder.DropColumn(
                name: "BookedQuantity",
                table: "PurchaseReturnEffectRounds");

            migrationBuilder.DropColumn(
                name: "SaleReturnEffectId",
                table: "ProductUnits");
        }
    }
}
