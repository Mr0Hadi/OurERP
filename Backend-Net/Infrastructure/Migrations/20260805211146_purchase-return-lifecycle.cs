using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class purchasereturnlifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturnDecision_PurchaseReturnItem_PurchaseReturnItemId",
                table: "PurchaseReturnDecision");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturnItem_PurchaseItems_PurchaseItemId",
                table: "PurchaseReturnItem");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturnItem_PurchaseReturns_PurchaseReturnId",
                table: "PurchaseReturnItem");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PurchaseReturnItem",
                table: "PurchaseReturnItem");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PurchaseReturnDecision",
                table: "PurchaseReturnDecision");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "PurchaseReturns");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "PaymentDetail");

            migrationBuilder.RenameTable(
                name: "PurchaseReturnItem",
                newName: "PurchaseReturnItems");

            migrationBuilder.RenameTable(
                name: "PurchaseReturnDecision",
                newName: "PurchaseReturnDecisions");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseReturnItem_PurchaseReturnId",
                table: "PurchaseReturnItems",
                newName: "IX_PurchaseReturnItems_PurchaseReturnId");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseReturnItem_PurchaseItemId",
                table: "PurchaseReturnItems",
                newName: "IX_PurchaseReturnItems_PurchaseItemId");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseReturnDecision_PurchaseReturnItemId",
                table: "PurchaseReturnDecisions",
                newName: "IX_PurchaseReturnDecisions_PurchaseReturnItemId");

            migrationBuilder.AddColumn<int>(
                name: "SettledQuantity",
                table: "PurchaseItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "PurchaseReturnItems",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AlterColumn<decimal>(
                name: "RefundAmount",
                table: "PurchaseReturnDecisions",
                type: "decimal(20,0)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(20,0)");

            migrationBuilder.AddColumn<DateTime>(
                name: "ResolvedAt",
                table: "PurchaseReturnDecisions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_PurchaseReturnItems",
                table: "PurchaseReturnItems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PurchaseReturnDecisions",
                table: "PurchaseReturnDecisions",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItems_ProductId",
                table: "PurchaseReturnItems",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseReturnDecisions_PurchaseReturnItems_PurchaseReturnItemId",
                table: "PurchaseReturnDecisions",
                column: "PurchaseReturnItemId",
                principalTable: "PurchaseReturnItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseReturnItems_Products_ProductId",
                table: "PurchaseReturnItems",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseReturnItems_PurchaseItems_PurchaseItemId",
                table: "PurchaseReturnItems",
                column: "PurchaseItemId",
                principalTable: "PurchaseItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseReturnItems_PurchaseReturns_PurchaseReturnId",
                table: "PurchaseReturnItems",
                column: "PurchaseReturnId",
                principalTable: "PurchaseReturns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturnDecisions_PurchaseReturnItems_PurchaseReturnItemId",
                table: "PurchaseReturnDecisions");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturnItems_Products_ProductId",
                table: "PurchaseReturnItems");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturnItems_PurchaseItems_PurchaseItemId",
                table: "PurchaseReturnItems");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturnItems_PurchaseReturns_PurchaseReturnId",
                table: "PurchaseReturnItems");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PurchaseReturnItems",
                table: "PurchaseReturnItems");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseReturnItems_ProductId",
                table: "PurchaseReturnItems");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PurchaseReturnDecisions",
                table: "PurchaseReturnDecisions");

            migrationBuilder.DropColumn(
                name: "SettledQuantity",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "PurchaseReturnItems");

            migrationBuilder.DropColumn(
                name: "ResolvedAt",
                table: "PurchaseReturnDecisions");

            migrationBuilder.RenameTable(
                name: "PurchaseReturnItems",
                newName: "PurchaseReturnItem");

            migrationBuilder.RenameTable(
                name: "PurchaseReturnDecisions",
                newName: "PurchaseReturnDecision");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseReturnItems_PurchaseReturnId",
                table: "PurchaseReturnItem",
                newName: "IX_PurchaseReturnItem_PurchaseReturnId");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseReturnItems_PurchaseItemId",
                table: "PurchaseReturnItem",
                newName: "IX_PurchaseReturnItem_PurchaseItemId");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseReturnDecisions_PurchaseReturnItemId",
                table: "PurchaseReturnDecision",
                newName: "IX_PurchaseReturnDecision_PurchaseReturnItemId");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "SaleItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "PurchaseReturns",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "PurchaseItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "PaymentDetail",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<decimal>(
                name: "RefundAmount",
                table: "PurchaseReturnDecision",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(20,0)",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_PurchaseReturnItem",
                table: "PurchaseReturnItem",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PurchaseReturnDecision",
                table: "PurchaseReturnDecision",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseReturnDecision_PurchaseReturnItem_PurchaseReturnItemId",
                table: "PurchaseReturnDecision",
                column: "PurchaseReturnItemId",
                principalTable: "PurchaseReturnItem",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseReturnItem_PurchaseItems_PurchaseItemId",
                table: "PurchaseReturnItem",
                column: "PurchaseItemId",
                principalTable: "PurchaseItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseReturnItem_PurchaseReturns_PurchaseReturnId",
                table: "PurchaseReturnItem",
                column: "PurchaseReturnId",
                principalTable: "PurchaseReturns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
