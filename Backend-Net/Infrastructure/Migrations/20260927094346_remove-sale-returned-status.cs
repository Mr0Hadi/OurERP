using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <summary>
    /// SalesStatusEnum.RETURNED (6) was removed: a sale's status now only says how far shipping got. Rows still at 6 go back to
    /// the shipping status their lines imply - SHIPPED (3) when every line is fully shipped, PARTIALLY_DELIVERED (2) otherwise.
    /// DELIVERED (4) cannot be recovered: RETURNED overwrote it and nothing else recorded the manual delivery, so those come
    /// back as SHIPPED. No schema change. Down is a no-op on purpose: which rows were RETURNED is not kept.
    /// </summary>
    public partial class removesalereturnedstatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE s SET s.Status = CASE
    WHEN EXISTS (SELECT 1 FROM SaleItems i WHERE i.SaleId = s.Id AND i.ShippedQuantity < i.Quantity) THEN 2
    ELSE 3
END
FROM Sales s
WHERE s.Status = 6;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
