using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class personelcodeint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence<int>(
                name: "UserPersonelCode",
                startValue: 1000L);

            migrationBuilder.AlterColumn<int>(
                name: "PersonelCode",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValueSql: "NEXT VALUE FOR UserPersonelCode",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropSequence(
                name: "UserPersonelCode");

            migrationBuilder.AlterColumn<string>(
                name: "PersonelCode",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValueSql: "NEXT VALUE FOR UserPersonelCode");
        }
    }
}
