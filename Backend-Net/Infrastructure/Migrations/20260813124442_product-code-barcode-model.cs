using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class productcodebarcodemodel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SupplierBarCode",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductUnits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    SerialNumber = table.Column<int>(type: "int", nullable: false),
                    Barcode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BarcodePayload = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PurchaseItemId = table.Column<int>(type: "int", nullable: true),
                    SaleItemId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SoldAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductUnits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductUnits_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductUnits_BarcodePayload",
                table: "ProductUnits",
                column: "BarcodePayload",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductUnits_ProductId_SerialNumber",
                table: "ProductUnits",
                columns: new[] { "ProductId", "SerialNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductUnits_PurchaseItemId",
                table: "ProductUnits",
                column: "PurchaseItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductUnits_SaleItemId",
                table: "ProductUnits",
                column: "SaleItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "SupplierBarCode",
                table: "Products");
        }
    }
}
