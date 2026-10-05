using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class posrrnuniqueandpaymentrecorder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PaymentDetails_PosTerminalId",
                table: "PaymentDetails");

            migrationBuilder.AlterColumn<string>(
                name: "TransferRef",
                table: "PaymentDetails",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RecordedAt",
                table: "PaymentDetails",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecordedByUserId",
                table: "PaymentDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "PaymentDetails",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_PosTerminalId_TransferRef",
                table: "PaymentDetails",
                columns: new[] { "PosTerminalId", "TransferRef" },
                unique: true,
                filter: "[PosTerminalId] IS NOT NULL AND [TransferRef] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_RecordedByUserId",
                table: "PaymentDetails",
                column: "RecordedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentDetails_Users_RecordedByUserId",
                table: "PaymentDetails",
                column: "RecordedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentDetails_Users_RecordedByUserId",
                table: "PaymentDetails");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDetails_PosTerminalId_TransferRef",
                table: "PaymentDetails");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDetails_RecordedByUserId",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "RecordedAt",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "RecordedByUserId",
                table: "PaymentDetails");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "PaymentDetails");

            migrationBuilder.AlterColumn<string>(
                name: "TransferRef",
                table: "PaymentDetails",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDetails_PosTerminalId",
                table: "PaymentDetails",
                column: "PosTerminalId");
        }
    }
}
