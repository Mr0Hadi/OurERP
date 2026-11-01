using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// GAP-06: CreditLimit is enforced now, and 0 means "cash only". Until now the customer form sent 0 for an empty field
    /// and every screen read 0 as "no limit", so every stored 0 is turned into null (no limit). Not reversible: after this,
    /// a 0 is a deliberate "cash only" and must not be turned back.
    /// </summary>
    public partial class creditlimitzerotonull : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE [Customers] SET [CreditLimit] = NULL WHERE [CreditLimit] = 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
