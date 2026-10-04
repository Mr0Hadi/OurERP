using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class pospaymentfields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankCode",
                table: "PosTerminals",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovalCode",
                table: "PaymentDetails",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MaskedCardNumber",
                table: "PaymentDetails",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PosTerminalId",
                table: "PaymentDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TraceNumber",
                table: "PaymentDetails",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_PosTerminalId",
                table: "PaymentDetails",
                column: "PosTerminalId");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentDetails_PosTerminals_PosTerminalId",
                table: "PaymentDetails",
                column: "PosTerminalId",
                principalTable: "PosTerminals",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentDetails_PosTerminals_PosTerminalId",
                table: "PaymentDetails");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDetails_PosTerminalId",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "BankCode",
                table: "PosTerminals");

            migrationBuilder.DropColumn(
                name: "ApprovalCode",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "MaskedCardNumber",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "PosTerminalId",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "TraceNumber",
                table: "PaymentDetails");
        }
    }
}
