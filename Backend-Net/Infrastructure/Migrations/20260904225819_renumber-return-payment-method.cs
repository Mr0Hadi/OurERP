using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class renumberreturnpaymentmethod : Migration
    {
        // ReturnPaymentMethodEnum با PaymentTypeEnum هم‌شماره شد (docs/payment-enum-unification.fa.md).
        // کهنه: CASH=0, CHECK=1, TRANSFER=2, ON_ACCOUNT=3, STORE_CREDIT=4, MIXED=5
        // نو:   CASH=0, ON_ACCOUNT=1, CHECK=2, TRANSFER=3, MIXED=4, STORE_CREDIT=5
        // چون یک جابه‌جاییِ چرخه‌ای است، باید در یک UPDATE با CASE انجام شود، نه چند UPDATE پشت‌سرهم.
        private static readonly string[] Tables =
        {
            "PurchaseReturnEffects",
            "SaleReturnEffects",
            "PurchaseReturnEffectMoneyParts",
            "SaleReturnEffectMoneyParts",
        };

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // کهنه → نو : 1→2, 2→3, 3→1, 4→5, 5→4 (و 0 و NULL بدون تغییر)
            Remap(migrationBuilder, "WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 1 WHEN 4 THEN 5 WHEN 5 THEN 4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // نو → کهنه : 1→3, 2→1, 3→2, 4→5, 5→4 (وارونِ نگاشتِ بالا)
            Remap(migrationBuilder, "WHEN 1 THEN 3 WHEN 2 THEN 1 WHEN 3 THEN 2 WHEN 4 THEN 5 WHEN 5 THEN 4");
        }

        private static void Remap(MigrationBuilder migrationBuilder, string cases)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql(
                    $"UPDATE [{table}] SET [Method] = CASE [Method] {cases} ELSE [Method] END;");
            }
        }
    }
}
