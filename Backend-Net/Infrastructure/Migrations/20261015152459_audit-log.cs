using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class auditlog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OccurredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    Action = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AuditEntityChanges",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AuditEventId = table.Column<long>(type: "bigint", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Operation = table.Column<int>(type: "int", nullable: false),
                    DocumentKind = table.Column<int>(type: "int", nullable: true),
                    DocumentId = table.Column<int>(type: "int", nullable: true),
                    OldValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValues = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditEntityChanges", x => x.Id);
                    table.CheckConstraint("CK_AuditEntityChanges_NewValuesJson", "ISJSON([NewValues], OBJECT) = 1");
                    table.CheckConstraint("CK_AuditEntityChanges_OldValuesJson", "ISJSON([OldValues], OBJECT) = 1");
                    table.ForeignKey(
                        name: "FK_AuditEntityChanges_AuditEvents_AuditEventId",
                        column: x => x.AuditEventId,
                        principalTable: "AuditEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntityChanges_AuditEventId",
                table: "AuditEntityChanges",
                column: "AuditEventId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntityChanges_DocumentKind_DocumentId",
                table: "AuditEntityChanges",
                columns: new[] { "DocumentKind", "DocumentId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntityChanges_EntityType_EntityKey",
                table: "AuditEntityChanges",
                columns: new[] { "EntityType", "EntityKey" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEvents_OccurredAt",
                table: "AuditEvents",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditEvents_UserId_OccurredAt",
                table: "AuditEvents",
                columns: new[] { "UserId", "OccurredAt" });

            // Hand-written: append-only in the database too, not just by convention. The application only ever inserts
            // into these tables; any UPDATE or DELETE - from the app or by hand - fails. Pruning old rows for retention
            // means disabling the trigger on purpose (DISABLE TRIGGER ... / ENABLE TRIGGER ...).
            migrationBuilder.Sql(@"
CREATE TRIGGER [TR_AuditEvents_AppendOnly] ON [AuditEvents] INSTEAD OF UPDATE, DELETE AS
BEGIN
    THROW 51000, N'AuditEvents is append-only.', 1;
END");
            migrationBuilder.Sql(@"
CREATE TRIGGER [TR_AuditEntityChanges_AppendOnly] ON [AuditEntityChanges] INSTEAD OF UPDATE, DELETE AS
BEGIN
    THROW 51000, N'AuditEntityChanges is append-only.', 1;
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditEntityChanges");

            migrationBuilder.DropTable(
                name: "AuditEvents");
        }
    }
}
