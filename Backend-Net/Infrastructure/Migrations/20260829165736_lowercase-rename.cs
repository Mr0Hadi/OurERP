using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class lowercaserename : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "transferRef",
                table: "PaymentDetail",
                newName: "TransferRef");

            migrationBuilder.RenameColumn(
                name: "checkNumber",
                table: "PaymentDetail",
                newName: "CheckNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TransferRef",
                table: "PaymentDetail",
                newName: "transferRef");

            migrationBuilder.RenameColumn(
                name: "CheckNumber",
                table: "PaymentDetail",
                newName: "checkNumber");
        }
    }
}
