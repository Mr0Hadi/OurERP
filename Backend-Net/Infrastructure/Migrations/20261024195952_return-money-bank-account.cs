using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class returnmoneybankaccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BankAccountId",
                table: "SaleReturnEffects",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BankAccountId",
                table: "SaleReturnEffectMoneyParts",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BankAccountId",
                table: "PurchaseReturnEffects",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BankAccountId",
                table: "PurchaseReturnEffectMoneyParts",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnEffects_BankAccountId",
                table: "SaleReturnEffects",
                column: "BankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnEffectMoneyParts_BankAccountId",
                table: "SaleReturnEffectMoneyParts",
                column: "BankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnEffects_BankAccountId",
                table: "PurchaseReturnEffects",
                column: "BankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnEffectMoneyParts_BankAccountId",
                table: "PurchaseReturnEffectMoneyParts",
                column: "BankAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseReturnEffectMoneyParts_BankAccounts_BankAccountId",
                table: "PurchaseReturnEffectMoneyParts",
                column: "BankAccountId",
                principalTable: "BankAccounts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseReturnEffects_BankAccounts_BankAccountId",
                table: "PurchaseReturnEffects",
                column: "BankAccountId",
                principalTable: "BankAccounts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SaleReturnEffectMoneyParts_BankAccounts_BankAccountId",
                table: "SaleReturnEffectMoneyParts",
                column: "BankAccountId",
                principalTable: "BankAccounts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SaleReturnEffects_BankAccounts_BankAccountId",
                table: "SaleReturnEffects",
                column: "BankAccountId",
                principalTable: "BankAccounts",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturnEffectMoneyParts_BankAccounts_BankAccountId",
                table: "PurchaseReturnEffectMoneyParts");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturnEffects_BankAccounts_BankAccountId",
                table: "PurchaseReturnEffects");

            migrationBuilder.DropForeignKey(
                name: "FK_SaleReturnEffectMoneyParts_BankAccounts_BankAccountId",
                table: "SaleReturnEffectMoneyParts");

            migrationBuilder.DropForeignKey(
                name: "FK_SaleReturnEffects_BankAccounts_BankAccountId",
                table: "SaleReturnEffects");

            migrationBuilder.DropIndex(
                name: "IX_SaleReturnEffects_BankAccountId",
                table: "SaleReturnEffects");

            migrationBuilder.DropIndex(
                name: "IX_SaleReturnEffectMoneyParts_BankAccountId",
                table: "SaleReturnEffectMoneyParts");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseReturnEffects_BankAccountId",
                table: "PurchaseReturnEffects");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseReturnEffectMoneyParts_BankAccountId",
                table: "PurchaseReturnEffectMoneyParts");

            migrationBuilder.DropColumn(
                name: "BankAccountId",
                table: "SaleReturnEffects");

            migrationBuilder.DropColumn(
                name: "BankAccountId",
                table: "SaleReturnEffectMoneyParts");

            migrationBuilder.DropColumn(
                name: "BankAccountId",
                table: "PurchaseReturnEffects");

            migrationBuilder.DropColumn(
                name: "BankAccountId",
                table: "PurchaseReturnEffectMoneyParts");
        }
    }
}
