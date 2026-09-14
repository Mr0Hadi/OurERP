using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class returneffectmodel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Every goods effect now carries its own UnitPrice, and a GOODS_IN round enters the cost pool at it.
            // Rows written before UnitPrice was required have none: give them the claim's price, which is what
            // they were valued at when they were recorded. Money effects (Direction 2, 3) keep NULL.
            migrationBuilder.Sql(@"
UPDATE e SET e.UnitPrice = c.UnitPrice
FROM PurchaseReturnEffects e
INNER JOIN PurchaseReturnResolutions r ON r.Id = e.PurchaseReturnResolutionId
INNER JOIN PurchaseReturnClaims c ON c.Id = r.PurchaseReturnClaimId
WHERE e.Direction IN (0, 1) AND e.UnitPrice IS NULL;

UPDATE e SET e.UnitPrice = c.UnitPrice
FROM SaleReturnEffects e
INNER JOIN SaleReturnResolutions r ON r.Id = e.SaleReturnResolutionId
INNER JOIN SaleReturnClaims c ON c.Id = r.SaleReturnClaimId
WHERE e.Direction IN (0, 1) AND e.UnitPrice IS NULL;
");

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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
    }
}
