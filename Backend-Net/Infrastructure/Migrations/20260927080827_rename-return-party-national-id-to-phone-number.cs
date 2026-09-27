using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class renamereturnpartynationalidtophonenumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PartyNationalId",
                table: "SaleReturnEffectRounds",
                newName: "PartyPhoneNumber");

            migrationBuilder.RenameColumn(
                name: "PartyNationalId",
                table: "PurchaseReturnEffectRounds",
                newName: "PartyPhoneNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PartyPhoneNumber",
                table: "SaleReturnEffectRounds",
                newName: "PartyNationalId");

            migrationBuilder.RenameColumn(
                name: "PartyPhoneNumber",
                table: "PurchaseReturnEffectRounds",
                newName: "PartyNationalId");
        }
    }
}
