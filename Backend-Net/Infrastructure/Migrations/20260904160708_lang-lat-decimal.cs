using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class langlatdecimal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "longitude",
                table: "Suppliers",
                newName: "Longitude");

            migrationBuilder.RenameColumn(
                name: "latitude",
                table: "Suppliers",
                newName: "Latitude");

            migrationBuilder.RenameColumn(
                name: "longitude",
                table: "Customers",
                newName: "Longitude");

            migrationBuilder.RenameColumn(
                name: "latitude",
                table: "Customers",
                newName: "Latitude");

            migrationBuilder.AlterColumn<decimal>(
                name: "Longitude",
                table: "Suppliers",
                type: "decimal(10,7)",
                precision: 10,
                scale: 7,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Latitude",
                table: "Suppliers",
                type: "decimal(10,7)",
                precision: 10,
                scale: 7,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Longitude",
                table: "Customers",
                type: "decimal(10,7)",
                precision: 10,
                scale: 7,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Latitude",
                table: "Customers",
                type: "decimal(10,7)",
                precision: 10,
                scale: 7,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Longitude",
                table: "Suppliers",
                newName: "longitude");

            migrationBuilder.RenameColumn(
                name: "Latitude",
                table: "Suppliers",
                newName: "latitude");

            migrationBuilder.RenameColumn(
                name: "Longitude",
                table: "Customers",
                newName: "longitude");

            migrationBuilder.RenameColumn(
                name: "Latitude",
                table: "Customers",
                newName: "latitude");

            migrationBuilder.AlterColumn<decimal>(
                name: "longitude",
                table: "Suppliers",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(10,7)",
                oldPrecision: 10,
                oldScale: 7,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "latitude",
                table: "Suppliers",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(10,7)",
                oldPrecision: 10,
                oldScale: 7,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "longitude",
                table: "Customers",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(10,7)",
                oldPrecision: 10,
                oldScale: 7,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "latitude",
                table: "Customers",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(10,7)",
                oldPrecision: 10,
                oldScale: 7,
                oldNullable: true);
        }
    }
}
