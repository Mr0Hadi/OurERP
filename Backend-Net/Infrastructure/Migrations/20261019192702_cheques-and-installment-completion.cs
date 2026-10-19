using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class chequesandinstallmentcompletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "EarlySettlementDiscountAmount",
                table: "SaleInstallments",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PenaltyAmount",
                table: "SaleInstallments",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "PenaltyWaiveReason",
                table: "SaleInstallments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PenaltyWaivedAmount",
                table: "SaleInstallments",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "EarlySettlementDiscountAmount",
                table: "SaleInstallmentPlans",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ReturnCreditAmount",
                table: "SaleInstallmentPlans",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "CheckBankName",
                table: "PaymentDetails",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckDrawerName",
                table: "PaymentDetails",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckDueDate",
                table: "PaymentDetails",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CheckStatus",
                table: "PaymentDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckStatusChangedAt",
                table: "PaymentDetails",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckStatusNote",
                table: "PaymentDetails",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EndorsedFromPaymentDetailId",
                table: "PaymentDetails",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SaleInstallmentReturnCredits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleInstallmentPlanId = table.Column<int>(type: "int", nullable: false),
                    SaleReturnClaimId = table.Column<int>(type: "int", nullable: false),
                    RequestedAmount = table.Column<decimal>(type: "decimal(20,0)", precision: 20, scale: 0, nullable: false),
                    AppliedAmount = table.Column<decimal>(type: "decimal(20,0)", precision: 20, scale: 0, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReversedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleInstallmentReturnCredits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleInstallmentReturnCredits_SaleInstallmentPlans_SaleInstallmentPlanId",
                        column: x => x.SaleInstallmentPlanId,
                        principalTable: "SaleInstallmentPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_CheckStatus_CheckDueDate",
                table: "PaymentDetails",
                columns: new[] { "CheckStatus", "CheckDueDate" },
                filter: "[CheckStatus] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_EndorsedFromPaymentDetailId",
                table: "PaymentDetails",
                column: "EndorsedFromPaymentDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleInstallmentReturnCredits_SaleInstallmentPlanId",
                table: "SaleInstallmentReturnCredits",
                column: "SaleInstallmentPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleInstallmentReturnCredits_SaleReturnClaimId",
                table: "SaleInstallmentReturnCredits",
                column: "SaleReturnClaimId");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentDetails_PaymentDetails_EndorsedFromPaymentDetailId",
                table: "PaymentDetails",
                column: "EndorsedFromPaymentDetailId",
                principalTable: "PaymentDetails",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Cheques recorded before the lifecycle existed were treated as cash on the day they were recorded. Keep that
            // meaning: every non-voided cheque row is CASHED on its PaidAt (so bank balances do not change), dated that day.
            // Voided ones stay without a status. Type 2 = CHECK, status 2 = CASHED.
            migrationBuilder.Sql(@"
UPDATE PaymentDetails
SET CheckStatus = 2, CheckStatusChangedAt = PaidAt, CheckDueDate = CAST(PaidAt AS date)
WHERE Type = 2 AND VoidedAt IS NULL AND CheckStatus IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentDetails_PaymentDetails_EndorsedFromPaymentDetailId",
                table: "PaymentDetails");

            migrationBuilder.DropTable(
                name: "SaleInstallmentReturnCredits");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDetails_CheckStatus_CheckDueDate",
                table: "PaymentDetails");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDetails_EndorsedFromPaymentDetailId",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "EarlySettlementDiscountAmount",
                table: "SaleInstallments");

            migrationBuilder.DropColumn(
                name: "PenaltyAmount",
                table: "SaleInstallments");

            migrationBuilder.DropColumn(
                name: "PenaltyWaiveReason",
                table: "SaleInstallments");

            migrationBuilder.DropColumn(
                name: "PenaltyWaivedAmount",
                table: "SaleInstallments");

            migrationBuilder.DropColumn(
                name: "EarlySettlementDiscountAmount",
                table: "SaleInstallmentPlans");

            migrationBuilder.DropColumn(
                name: "ReturnCreditAmount",
                table: "SaleInstallmentPlans");

            migrationBuilder.DropColumn(
                name: "CheckBankName",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "CheckDrawerName",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "CheckDueDate",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "CheckStatus",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "CheckStatusChangedAt",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "CheckStatusNote",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "EndorsedFromPaymentDetailId",
                table: "PaymentDetails");
        }
    }
}
