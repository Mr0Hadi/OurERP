using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class reservationexpiryandsystemsettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ReservationExpiresAt",
                table: "Sales",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.Key);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_ReservationExpiresAt",
                table: "Sales",
                column: "ReservationExpiresAt",
                filter: "[ReservationExpiresAt] IS NOT NULL");

            // Proformas that already hold reserved units (Status 0 = PROFORMA, unit Status 10 = RESERVED) get the default
            // 10 minutes from the moment this runs, rather than holding them forever. GETDATE() is the database server's local
            // clock; the app compares against its own DateTime.Now, so both must run in the same time zone (they do on one host).
            migrationBuilder.Sql(@"
UPDATE s SET s.ReservationExpiresAt = DATEADD(MINUTE, 10, GETDATE())
FROM Sales s
WHERE s.Status = 0 AND s.IsActive = 1
  AND EXISTS (SELECT 1 FROM ProductUnits u JOIN SaleItems i ON i.Id = u.SaleItemId
              WHERE i.SaleId = s.Id AND u.Status = 10);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SystemSettings");

            migrationBuilder.DropIndex(
                name: "IX_Sales_ReservationExpiresAt",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "ReservationExpiresAt",
                table: "Sales");
        }
    }
}
