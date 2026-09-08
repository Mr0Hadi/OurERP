using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class renameeffectappliedquantity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "DoneQuantity",
                table: "SaleReturnEffects",
                newName: "AppliedQuantity");

            migrationBuilder.RenameColumn(
                name: "DoneQuantity",
                table: "PurchaseReturnEffects",
                newName: "AppliedQuantity");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "AppliedQuantity",
                table: "SaleReturnEffects",
                newName: "DoneQuantity");

            migrationBuilder.RenameColumn(
                name: "AppliedQuantity",
                table: "PurchaseReturnEffects",
                newName: "DoneQuantity");
        }
    }
}
