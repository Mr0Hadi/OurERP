using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// ReturnPaymentMethodEnum.STORE_CREDIT (5) was removed: store credit is not a feature of this
    /// system. No schema change - Method is a plain int - so this migration only moves persisted
    /// rows off the removed value, to ON_ACCOUNT (1): "settled against the counterparty's account,
    /// no cash moved" is the closest remaining meaning. Down is a no-op on purpose: after Up there
    /// is no way to tell a former STORE_CREDIT row from a genuine ON_ACCOUNT one.
    /// </summary>
    public partial class removestorecredit : Migration
    {
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
            foreach (var table in Tables)
                migrationBuilder.Sql($"UPDATE [{table}] SET [Method] = 1 WHERE [Method] = 5;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
