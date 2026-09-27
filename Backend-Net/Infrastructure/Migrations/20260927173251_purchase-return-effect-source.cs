using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class purchasereturneffectsource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "PurchaseReturnEffects",
                type: "int",
                nullable: true);

            // A release always took quarantined units (GOODS_RELEASE = 4 -> QUARANTINED = 9). Other goods-out effects decided before
            // this column stay null: for a pending one the warehouse still states the source at execution, and until then it counts
            // as a quarantine reservation.
            migrationBuilder.Sql("UPDATE PurchaseReturnEffects SET Source = 9 WHERE Direction = 4;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Source",
                table: "PurchaseReturnEffects");
        }
    }
}
