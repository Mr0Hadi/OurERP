using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class stuff4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProductCode",
                table: "PurchaseItem");

            migrationBuilder.DropColumn(
                name: "ProductName",
                table: "PurchaseItem");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "PurchaseItem");

            migrationBuilder.AddColumn<int>(
                name: "PaymentType",
                table: "Purchases",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "PaymentDetail",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PurchaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PurchaseId1 = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    checkNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    transferRef = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentDetail", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentDetail_Purchases_PurchaseId1",
                        column: x => x.PurchaseId1,
                        principalTable: "Purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetail_PurchaseId1",
                table: "PaymentDetail",
                column: "PurchaseId1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentDetail");

            migrationBuilder.DropColumn(
                name: "PaymentType",
                table: "Purchases");

            migrationBuilder.AddColumn<string>(
                name: "ProductCode",
                table: "PurchaseItem",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ProductName",
                table: "PurchaseItem",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Unit",
                table: "PurchaseItem",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
