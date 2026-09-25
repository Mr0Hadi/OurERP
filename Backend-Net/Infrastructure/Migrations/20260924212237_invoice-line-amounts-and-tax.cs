using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// Server-computed invoice amounts (InvoiceLineMath) and the installment charge kept apart from the invoice.
    /// Backfill, in order:
    ///  1. every product and every existing line becomes TAXABLE (the only category before this migration);
    ///  2. each line snapshots its product's current rate and gets its amounts with the same formula and rounding as the
    ///     code (SQL Server's ROUND is half away from zero for these positive values, like MidpointRounding.AwayFromZero);
    ///  3. a plan's charge = its old total - cash, and the sale's total goes back to the invoice (= the plan's cash) - it
    ///     used to be overwritten with cash + markup;
    ///  4. drafts (PROFORMA) without a plan are re-totalled from their lines, exactly as their next save would do.
    /// Issued invoices keep their stored TotalAmount: it is a historical fact, even where it was typed by hand and does not
    /// equal the sum of the backfilled lines.
    /// </summary>
    public partial class invoicelineamountsandtax : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "SaleItems",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "GrossAmount",
                table: "SaleItems",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "NetAmount",
                table: "SaleItems",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxAmount",
                table: "SaleItems",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "TaxCategory",
                table: "SaleItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TaxPercent",
                table: "SaleItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalAmount",
                table: "SaleItems",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "InstallmentChargeAmount",
                table: "SaleInstallmentPlans",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "PurchaseItems",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "GrossAmount",
                table: "PurchaseItems",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "NetAmount",
                table: "PurchaseItems",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxAmount",
                table: "PurchaseItems",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "TaxCategory",
                table: "PurchaseItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TaxPercent",
                table: "PurchaseItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalAmount",
                table: "PurchaseItems",
                type: "decimal(20,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "TaxCategory",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("UPDATE [Products] SET [TaxCategory] = 1;");

            foreach (var table in new[] { "SaleItems", "PurchaseItems" })
            {
                migrationBuilder.Sql($@"
UPDATE i SET i.[TaxCategory] = 1, i.[TaxPercent] = p.[Tax]
FROM [{table}] i JOIN [Products] p ON p.[Id] = i.[ProductId];");

                migrationBuilder.Sql($@"
UPDATE [{table}] SET [GrossAmount] = CAST([Quantity] AS decimal(38, 4)) * [UnitPrice];");

                migrationBuilder.Sql($@"
UPDATE [{table}] SET [DiscountAmount] = ROUND([GrossAmount] * [Discount] / 100.0, 0);");

                migrationBuilder.Sql($@"
UPDATE [{table}] SET [NetAmount] = [GrossAmount] - [DiscountAmount];");

                migrationBuilder.Sql($@"
UPDATE [{table}] SET [TaxAmount] = ROUND([NetAmount] * [TaxPercent] / 100.0, 0);");

                migrationBuilder.Sql($@"
UPDATE [{table}] SET [TotalAmount] = [NetAmount] + [TaxAmount];");
            }

            migrationBuilder.Sql(@"
UPDATE [SaleInstallmentPlans]
SET [InstallmentChargeAmount] = CASE WHEN [TotalAmount] > [CashAmount] THEN [TotalAmount] - [CashAmount] ELSE 0 END;");

            migrationBuilder.Sql(@"
UPDATE s SET s.[TotalAmount] = pl.[CashAmount]
FROM [Sales] s JOIN [SaleInstallmentPlans] pl ON pl.[SaleId] = s.[Id];");

            migrationBuilder.Sql(@"
UPDATE s SET s.[TotalAmount] = COALESCE((SELECT SUM(i.[TotalAmount]) FROM [SaleItems] i WHERE i.[SaleId] = s.[Id]), 0)
FROM [Sales] s
WHERE s.[Status] = 0 AND NOT EXISTS (SELECT 1 FROM [SaleInstallmentPlans] pl WHERE pl.[SaleId] = s.[Id]);");

            migrationBuilder.Sql(@"
UPDATE pu SET pu.[TotalAmount] = COALESCE((SELECT SUM(i.[TotalAmount]) FROM [PurchaseItems] i WHERE i.[PurchaseId] = pu.[Id]), 0)
FROM [Purchases] pu
WHERE pu.[Status] = 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "GrossAmount",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "NetAmount",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "TaxAmount",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "TaxCategory",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "TaxPercent",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "TotalAmount",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "InstallmentChargeAmount",
                table: "SaleInstallmentPlans");

            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "GrossAmount",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "NetAmount",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "TaxAmount",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "TaxCategory",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "TaxPercent",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "TotalAmount",
                table: "PurchaseItems");

            migrationBuilder.DropColumn(
                name: "TaxCategory",
                table: "Products");
        }
    }
}
