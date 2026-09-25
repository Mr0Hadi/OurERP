using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// The party ledger (customer/supplier accounts). Deliberately NOT backfilled - agreed with the user: the ledger starts
    /// empty and records from the day this is applied. Invoices and payments that already exist are not on anyone's account,
    /// so an existing party's LedgerBalance reflects only activity after this migration.
    /// </summary>
    public partial class partyledger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PartyLedgerEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CustomerId = table.Column<int>(type: "int", nullable: true),
                    SupplierId = table.Column<int>(type: "int", nullable: true),
                    Direction = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    EntryType = table.Column<int>(type: "int", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SaleId = table.Column<int>(type: "int", nullable: true),
                    PurchaseId = table.Column<int>(type: "int", nullable: true),
                    PaymentDetailId = table.Column<int>(type: "int", nullable: true),
                    SaleReturnClaimId = table.Column<int>(type: "int", nullable: true),
                    PurchaseReturnClaimId = table.Column<int>(type: "int", nullable: true),
                    PurchaseItemId = table.Column<int>(type: "int", nullable: true),
                    ReversalOfEntryId = table.Column<int>(type: "int", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartyLedgerEntries", x => x.Id);
                    table.CheckConstraint("CK_PartyLedgerEntries_OneParty", "([CustomerId] IS NOT NULL AND [SupplierId] IS NULL) OR ([CustomerId] IS NULL AND [SupplierId] IS NOT NULL)");
                    table.CheckConstraint("CK_PartyLedgerEntries_PositiveAmount", "[Amount] > 0");
                    table.ForeignKey(
                        name: "FK_PartyLedgerEntries_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PartyLedgerEntries_PartyLedgerEntries_ReversalOfEntryId",
                        column: x => x.ReversalOfEntryId,
                        principalTable: "PartyLedgerEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PartyLedgerEntries_PaymentDetails_PaymentDetailId",
                        column: x => x.PaymentDetailId,
                        principalTable: "PaymentDetails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PartyLedgerEntries_Purchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "Purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PartyLedgerEntries_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PartyLedgerEntries_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PartyLedgerEntries_CustomerId_OccurredAt",
                table: "PartyLedgerEntries",
                columns: new[] { "CustomerId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PartyLedgerEntries_PaymentDetailId",
                table: "PartyLedgerEntries",
                column: "PaymentDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_PartyLedgerEntries_PurchaseId",
                table: "PartyLedgerEntries",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_PartyLedgerEntries_ReversalOfEntryId",
                table: "PartyLedgerEntries",
                column: "ReversalOfEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_PartyLedgerEntries_SaleId",
                table: "PartyLedgerEntries",
                column: "SaleId");

            migrationBuilder.CreateIndex(
                name: "IX_PartyLedgerEntries_SupplierId_OccurredAt",
                table: "PartyLedgerEntries",
                columns: new[] { "SupplierId", "OccurredAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PartyLedgerEntries");
        }
    }
}
