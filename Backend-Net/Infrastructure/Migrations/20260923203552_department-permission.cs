using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class departmentpermission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DepartmentPermissionTemplates",
                columns: table => new
                {
                    DepartmentId = table.Column<int>(type: "int", nullable: false),
                    Permission = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentPermissionTemplates", x => new { x.DepartmentId, x.Permission });
                    table.ForeignKey(
                        name: "FK_DepartmentPermissionTemplates_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DepartmentPermissionTemplates");
        }
    }
}
