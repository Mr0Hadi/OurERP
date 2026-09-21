using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class quarantineunitcost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "QuarantineCost",
                table: "ProductUnits",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            // Backfill every unit that is in quarantine now, with the value receiving would have stamped on it: the paid-for
            // defective share of an order line at that line's net price, everything else (excess, unlisted) at 0. A damaged
            // replacement held under ON_ORDER custody also gets the line price rather than the average it entered at - the
            // entry cost was never stored, and the data is still test data (agreed 2026-09-21). Units outside quarantine stay
            // NULL: the column only means something while a unit is held.
            migrationBuilder.Sql(@"
UPDATE u
SET u.QuarantineCost = CASE
        WHEN u.CustodyReason = 1 AND pi.Id IS NOT NULL THEN pi.UnitPrice * (100 - pi.Discount) / 100.0
        ELSE 0
    END
FROM ProductUnits u
LEFT JOIN PurchaseItems pi ON pi.Id = u.PurchaseItemId
WHERE u.Status = 9;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QuarantineCost",
                table: "ProductUnits");
        }
    }
}
