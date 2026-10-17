using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class bankaccountsandpartypayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BankAccountId",
                table: "PosTerminals",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BankAccountId",
                table: "PaymentDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CustomerId",
                table: "PaymentDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "PaymentDetails",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupplierId",
                table: "PaymentDetails",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BankAccounts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    BankName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AccountNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CardNumber = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    Iban = table.Column<string>(type: "nvarchar(34)", maxLength: 34, nullable: true),
                    OpeningBalance = table.Column<decimal>(type: "decimal(20,0)", precision: 20, scale: 0, nullable: false),
                    OpeningDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankAccounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PaymentAllocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PaymentDetailId = table.Column<int>(type: "int", nullable: false),
                    SaleId = table.Column<int>(type: "int", nullable: true),
                    PurchaseId = table.Column<int>(type: "int", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(20,0)", precision: 20, scale: 0, nullable: false),
                    AllocatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AllocatedByUserId = table.Column<int>(type: "int", nullable: true),
                    VoidedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentAllocations", x => x.Id);
                    table.CheckConstraint("CK_PaymentAllocations_OneDocument", "([SaleId] IS NOT NULL AND [PurchaseId] IS NULL) OR ([SaleId] IS NULL AND [PurchaseId] IS NOT NULL)");
                    table.CheckConstraint("CK_PaymentAllocations_PositiveAmount", "[Amount] > 0");
                    table.ForeignKey(
                        name: "FK_PaymentAllocations_PaymentDetails_PaymentDetailId",
                        column: x => x.PaymentDetailId,
                        principalTable: "PaymentDetails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PaymentAllocations_Purchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "Purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PaymentAllocations_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BankAccountTransfers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FromBankAccountId = table.Column<int>(type: "int", nullable: false),
                    ToBankAccountId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(20,0)", precision: 20, scale: 0, nullable: false),
                    TransferredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TransferRef = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    VoidedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankAccountTransfers", x => x.Id);
                    table.CheckConstraint("CK_BankAccountTransfers_PositiveAmount", "[Amount] > 0");
                    table.CheckConstraint("CK_BankAccountTransfers_TwoAccounts", "[FromBankAccountId] <> [ToBankAccountId]");
                    table.ForeignKey(
                        name: "FK_BankAccountTransfers_BankAccounts_FromBankAccountId",
                        column: x => x.FromBankAccountId,
                        principalTable: "BankAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BankAccountTransfers_BankAccounts_ToBankAccountId",
                        column: x => x.ToBankAccountId,
                        principalTable: "BankAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PosTerminals_BankAccountId",
                table: "PosTerminals",
                column: "BankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_BankAccountId",
                table: "PaymentDetails",
                column: "BankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_CustomerId",
                table: "PaymentDetails",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_SupplierId",
                table: "PaymentDetails",
                column: "SupplierId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PaymentDetails_OnAccountParty",
                table: "PaymentDetails",
                sql: "([CustomerId] IS NULL AND [SupplierId] IS NULL) OR ([SaleId] IS NULL AND [PurchaseId] IS NULL AND ([CustomerId] IS NULL OR [SupplierId] IS NULL))");

            migrationBuilder.CreateIndex(
                name: "IX_BankAccountTransfers_FromBankAccountId",
                table: "BankAccountTransfers",
                column: "FromBankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_BankAccountTransfers_ToBankAccountId",
                table: "BankAccountTransfers",
                column: "ToBankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAllocations_PaymentDetailId",
                table: "PaymentAllocations",
                column: "PaymentDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAllocations_PurchaseId",
                table: "PaymentAllocations",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAllocations_SaleId",
                table: "PaymentAllocations",
                column: "SaleId");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentDetails_BankAccounts_BankAccountId",
                table: "PaymentDetails",
                column: "BankAccountId",
                principalTable: "BankAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentDetails_Customers_CustomerId",
                table: "PaymentDetails",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentDetails_Suppliers_SupplierId",
                table: "PaymentDetails",
                column: "SupplierId",
                principalTable: "Suppliers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PosTerminals_BankAccounts_BankAccountId",
                table: "PosTerminals",
                column: "BankAccountId",
                principalTable: "BankAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentDetails_BankAccounts_BankAccountId",
                table: "PaymentDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_PaymentDetails_Customers_CustomerId",
                table: "PaymentDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_PaymentDetails_Suppliers_SupplierId",
                table: "PaymentDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_PosTerminals_BankAccounts_BankAccountId",
                table: "PosTerminals");

            migrationBuilder.DropTable(
                name: "BankAccountTransfers");

            migrationBuilder.DropTable(
                name: "PaymentAllocations");

            migrationBuilder.DropTable(
                name: "BankAccounts");

            migrationBuilder.DropIndex(
                name: "IX_PosTerminals_BankAccountId",
                table: "PosTerminals");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDetails_BankAccountId",
                table: "PaymentDetails");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDetails_CustomerId",
                table: "PaymentDetails");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDetails_SupplierId",
                table: "PaymentDetails");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PaymentDetails_OnAccountParty",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "BankAccountId",
                table: "PosTerminals");

            migrationBuilder.DropColumn(
                name: "BankAccountId",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "SupplierId",
                table: "PaymentDetails");
        }
    }
}
