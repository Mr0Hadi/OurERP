using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class discrepancydecisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReceiptDiscrepancies_PurchaseReturnItems_PurchaseReturnItemId",
                table: "ReceiptDiscrepancies");

            migrationBuilder.DropTable(
                name: "ReturnItemDecisions");

            migrationBuilder.DropTable(
                name: "PurchaseReturnItems");

            migrationBuilder.DropTable(
                name: "PurchaseReturns");

            migrationBuilder.DropIndex(
                name: "IX_ReceiptDiscrepancies_PurchaseReturnItemId",
                table: "ReceiptDiscrepancies");

            migrationBuilder.DropColumn(
                name: "PurchaseReturnItemId",
                table: "ReceiptDiscrepancies");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "ReceiptDiscrepancies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "ReceiptDiscrepancies",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "DiscrepancyDecisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DecisionType = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitCost = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DiscrepancyId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiscrepancyDecisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DiscrepancyDecisions_ReceiptDiscrepancies_DiscrepancyId",
                        column: x => x.DiscrepancyId,
                        principalTable: "ReceiptDiscrepancies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DiscrepancyDecisions_DiscrepancyId",
                table: "DiscrepancyDecisions",
                column: "DiscrepancyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiscrepancyDecisions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "ReceiptDiscrepancies");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "ReceiptDiscrepancies");

            migrationBuilder.AddColumn<int>(
                name: "PurchaseReturnItemId",
                table: "ReceiptDiscrepancies",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PurchaseReturns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReturnNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReturns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturns_Purchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "Purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseReturnItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseItemId = table.Column<int>(type: "int", nullable: false),
                    PurchaseReturnId = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TotalQuantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReturnItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnItems_PurchaseItems_PurchaseItemId",
                        column: x => x.PurchaseItemId,
                        principalTable: "PurchaseItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnItems_PurchaseReturns_PurchaseReturnId",
                        column: x => x.PurchaseReturnId,
                        principalTable: "PurchaseReturns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReturnItemDecisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseReturnItemId = table.Column<int>(type: "int", nullable: false),
                    DecisionType = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitCost = table.Column<decimal>(type: "decimal(20,0)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnItemDecisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReturnItemDecisions_PurchaseReturnItems_PurchaseReturnItemId",
                        column: x => x.PurchaseReturnItemId,
                        principalTable: "PurchaseReturnItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptDiscrepancies_PurchaseReturnItemId",
                table: "ReceiptDiscrepancies",
                column: "PurchaseReturnItemId",
                unique: true,
                filter: "[PurchaseReturnItemId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItems_PurchaseItemId",
                table: "PurchaseReturnItems",
                column: "PurchaseItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItems_PurchaseReturnId",
                table: "PurchaseReturnItems",
                column: "PurchaseReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturns_PurchaseId",
                table: "PurchaseReturns",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnItemDecisions_PurchaseReturnItemId",
                table: "ReturnItemDecisions",
                column: "PurchaseReturnItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_ReceiptDiscrepancies_PurchaseReturnItems_PurchaseReturnItemId",
                table: "ReceiptDiscrepancies",
                column: "PurchaseReturnItemId",
                principalTable: "PurchaseReturnItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
