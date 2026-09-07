using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class renameeffectdirectionandreturndate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "RequestDate",
                table: "SaleReturns",
                newName: "ReturnDate");

            migrationBuilder.RenameColumn(
                name: "Kind",
                table: "SaleReturnEffects",
                newName: "Direction");

            migrationBuilder.RenameColumn(
                name: "Kind",
                table: "PurchaseReturnEffects",
                newName: "Direction");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ReturnDate",
                table: "SaleReturns",
                newName: "RequestDate");

            migrationBuilder.RenameColumn(
                name: "Direction",
                table: "SaleReturnEffects",
                newName: "Kind");

            migrationBuilder.RenameColumn(
                name: "Direction",
                table: "PurchaseReturnEffects",
                newName: "Kind");
        }
    }
}
