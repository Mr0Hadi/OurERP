using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class addsalepurchaseemployeelink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SalesUserId",
                table: "Sales",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PurchasingUserId",
                table: "Purchases",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_SalesUserId",
                table: "Sales",
                column: "SalesUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_PurchasingUserId",
                table: "Purchases",
                column: "PurchasingUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Purchases_Users_PurchasingUserId",
                table: "Purchases",
                column: "PurchasingUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sales_Users_SalesUserId",
                table: "Sales",
                column: "SalesUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Purchases_Users_PurchasingUserId",
                table: "Purchases");

            migrationBuilder.DropForeignKey(
                name: "FK_Sales_Users_SalesUserId",
                table: "Sales");

            migrationBuilder.DropIndex(
                name: "IX_Sales_SalesUserId",
                table: "Sales");

            migrationBuilder.DropIndex(
                name: "IX_Purchases_PurchasingUserId",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "SalesUserId",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "PurchasingUserId",
                table: "Purchases");
        }
    }
}
