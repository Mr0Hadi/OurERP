using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class productunitprintandquarantinestamp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FirstPrintedAt",
                table: "ProductUnits",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastPrintedAt",
                table: "ProductUnits",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LastPrintedByUserId",
                table: "ProductUnits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PrintCount",
                table: "ProductUnits",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "QuarantineDocumentId",
                table: "ProductUnits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QuarantineDocumentKind",
                table: "ProductUnits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "QuarantinedAt",
                table: "ProductUnits",
                type: "datetime2",
                nullable: true);

            // Units already in quarantine: stamp when and by which document they last entered it, from their own movement rows
            // (QUARANTINED = 9). Labels printed before this existed are unknown, so every unit starts unprinted.
            migrationBuilder.Sql(@"
UPDATE u SET u.QuarantinedAt = m.OccurredAt, u.QuarantineDocumentKind = m.DocumentKind, u.QuarantineDocumentId = m.DocumentId
FROM ProductUnits u
CROSS APPLY (SELECT TOP 1 OccurredAt, DocumentKind, DocumentId FROM ProductUnitMovements
             WHERE ProductUnitId = u.Id AND ToStatus = 9 ORDER BY Id DESC) m
WHERE u.Status = 9;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FirstPrintedAt",
                table: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "LastPrintedAt",
                table: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "LastPrintedByUserId",
                table: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "PrintCount",
                table: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "QuarantineDocumentId",
                table: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "QuarantineDocumentKind",
                table: "ProductUnits");

            migrationBuilder.DropColumn(
                name: "QuarantinedAt",
                table: "ProductUnits");
        }
    }
}
