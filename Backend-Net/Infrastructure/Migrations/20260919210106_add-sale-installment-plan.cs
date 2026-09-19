using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// فروش اقساطی: جدول‌های SaleInstallmentPlans/SaleInstallments، به‌علاوه‌ی اصلاح PaymentDetail.
    ///
    /// بخش PaymentDetail عمداً drop/recreate است و نه ALTER: کلید اصلی از uniqueidentifier به
    /// int IDENTITY تغییر می‌کند (SQL Server نه این تبدیل نوع را روی یک ستون موجود انجام می‌دهد
    /// و نه IDENTITY را با ALTER اضافه می‌کند)، و FK سایه‌ای PurchaseId1 - که EF از روی
    /// Sale.PaymentDetails ساخته بود - باید برود. دیتای واقعی روی این جدول وجود ندارد، پس
    /// drop/recreate قابل قبول است. نسخه‌ی scaffold‌شده‌ی EF به‌جای آن یک
    /// RenameColumn(PurchaseId1 -> Purpose) و AlterColumn روی Id تولید کرده بود که روی
    /// SQL Server شکست می‌خورد؛ این فایل دستی اصلاح شده است.
    /// </summary>
    public partial class addsaleinstallmentplan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentDetail");

            migrationBuilder.CreateTable(
                name: "PaymentDetails",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseId = table.Column<int>(type: "int", nullable: true),
                    SaleId = table.Column<int>(type: "int", nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Purpose = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(20,0)", precision: 20, scale: 0, nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CheckNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TransferRef = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentDetails_Purchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "Purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PaymentDetails_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleInstallmentPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleId = table.Column<int>(type: "int", nullable: false),
                    CashAmount = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    MarkupPercentage = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    DownPaymentAmount = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    FinancedAmount = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    InstallmentCount = table.Column<int>(type: "int", nullable: false),
                    InstallmentAmount = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    FirstDueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LatePenaltyPercentage = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleInstallmentPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleInstallmentPlans_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleInstallments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleInstallmentPlanId = table.Column<int>(type: "int", nullable: false),
                    Number = table.Column<int>(type: "int", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PaymentType = table.Column<int>(type: "int", nullable: true),
                    PaymentDetailId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleInstallments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleInstallments_PaymentDetails_PaymentDetailId",
                        column: x => x.PaymentDetailId,
                        principalTable: "PaymentDetails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SaleInstallments_SaleInstallmentPlans_SaleInstallmentPlanId",
                        column: x => x.SaleInstallmentPlanId,
                        principalTable: "SaleInstallmentPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_PurchaseId",
                table: "PaymentDetails",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_SaleId",
                table: "PaymentDetails",
                column: "SaleId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleInstallmentPlans_SaleId",
                table: "SaleInstallmentPlans",
                column: "SaleId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SaleInstallments_DueDate",
                table: "SaleInstallments",
                column: "DueDate");

            migrationBuilder.CreateIndex(
                name: "IX_SaleInstallments_PaymentDetailId",
                table: "SaleInstallments",
                column: "PaymentDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleInstallments_SaleInstallmentPlanId_Number",
                table: "SaleInstallments",
                columns: new[] { "SaleInstallmentPlanId", "Number" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SaleInstallments");

            migrationBuilder.DropTable(
                name: "SaleInstallmentPlans");

            migrationBuilder.DropTable(
                name: "PaymentDetails");

            // شکل قبلی جدول، شامل ستون سایه‌ای PurchaseId1 که EF از روی Sale.PaymentDetails ساخته بود.
            migrationBuilder.CreateTable(
                name: "PaymentDetail",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PurchaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PurchaseId1 = table.Column<int>(type: "int", nullable: true),
                    SaleId = table.Column<int>(type: "int", nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CheckNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TransferRef = table.Column<string>(type: "nvarchar(max)", nullable: true)
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
                    table.ForeignKey(
                        name: "FK_PaymentDetail_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetail_PurchaseId1",
                table: "PaymentDetail",
                column: "PurchaseId1");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetail_SaleId",
                table: "PaymentDetail",
                column: "SaleId");
        }
    }
}
