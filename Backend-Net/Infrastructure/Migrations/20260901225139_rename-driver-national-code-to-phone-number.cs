using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class renamedrivernationalcodetophonenumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "DriverNationalCode",
                table: "SaleDrivers",
                newName: "DriverPhoneNumber");

            migrationBuilder.RenameColumn(
                name: "DriverNationalCode",
                table: "PurchaseDrivers",
                newName: "DriverPhoneNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "DriverPhoneNumber",
                table: "SaleDrivers",
                newName: "DriverNationalCode");

            migrationBuilder.RenameColumn(
                name: "DriverPhoneNumber",
                table: "PurchaseDrivers",
                newName: "DriverNationalCode");
        }
    }
}
