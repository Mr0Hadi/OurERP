using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class salepurchaserelations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseItem_Products_ProductId",
                table: "PurchaseItem");

            migrationBuilder.DropTable(
                name: "PurchaseProduct");

            migrationBuilder.DropTable(
                name: "SaleProduct");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PurchaseItem",
                table: "PurchaseItem");

            migrationBuilder.RenameTable(
                name: "PurchaseItem",
                newName: "PurchaseItems");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseItem_ProductId",
                table: "PurchaseItems",
                newName: "IX_PurchaseItems_ProductId");

            migrationBuilder.AddColumn<int>(
                name: "SaleId",
                table: "PaymentDetail",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PurchaseId",
                table: "PurchaseItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_PurchaseItems",
                table: "PurchaseItems",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "SaleItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    Discount = table.Column<int>(type: "int", nullable: false),
                    SaleId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SaleItems_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetail_SaleId",
                table: "PaymentDetail",
                column: "SaleId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseItems_PurchaseId",
                table: "PurchaseItems",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_ProductId",
                table: "SaleItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_SaleId",
                table: "SaleItems",
                column: "SaleId");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentDetail_Sales_SaleId",
                table: "PaymentDetail",
                column: "SaleId",
                principalTable: "Sales",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseItems_Products_ProductId",
                table: "PurchaseItems",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseItems_Purchases_PurchaseId",
                table: "PurchaseItems",
                column: "PurchaseId",
                principalTable: "Purchases",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentDetail_Sales_SaleId",
                table: "PaymentDetail");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseItems_Products_ProductId",
                table: "PurchaseItems");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseItems_Purchases_PurchaseId",
                table: "PurchaseItems");

            migrationBuilder.DropTable(
                name: "SaleItems");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDetail_SaleId",
                table: "PaymentDetail");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PurchaseItems",
                table: "PurchaseItems");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseItems_PurchaseId",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "SaleId",
                table: "PaymentDetail");

            migrationBuilder.DropColumn(
                name: "PurchaseId",
                table: "PurchaseItems");

            migrationBuilder.RenameTable(
                name: "PurchaseItems",
                newName: "PurchaseItem");

            migrationBuilder.RenameIndex(
                name: "IX_PurchaseItems_ProductId",
                table: "PurchaseItem",
                newName: "IX_PurchaseItem_ProductId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PurchaseItem",
                table: "PurchaseItem",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "PurchaseProduct",
                columns: table => new
                {
                    ItemsId = table.Column<int>(type: "int", nullable: false),
                    PurchaseId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseProduct", x => new { x.ItemsId, x.PurchaseId });
                    table.ForeignKey(
                        name: "FK_PurchaseProduct_PurchaseItem_ItemsId",
                        column: x => x.ItemsId,
                        principalTable: "PurchaseItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseProduct_Purchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "Purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleProduct",
                columns: table => new
                {
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    SaleId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleProduct", x => new { x.ItemId, x.SaleId });
                    table.ForeignKey(
                        name: "FK_SaleProduct_Products_ItemId",
                        column: x => x.ItemId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SaleProduct_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseProduct_PurchaseId",
                table: "PurchaseProduct",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleProduct_SaleId",
                table: "SaleProduct",
                column: "SaleId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseItem_Products_ProductId",
                table: "PurchaseItem",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
