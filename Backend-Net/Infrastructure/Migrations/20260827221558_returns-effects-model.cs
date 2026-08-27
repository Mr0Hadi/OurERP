using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class returnseffectsmodel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseReturnDecisions");

            migrationBuilder.DropTable(
                name: "SaleReturnDecisions");

            migrationBuilder.DropTable(
                name: "PurchaseReturnItems");

            migrationBuilder.DropTable(
                name: "SaleReturnItems");

            migrationBuilder.RenameColumn(
                name: "Reason",
                table: "SaleReturnClaims",
                newName: "Scope");

            migrationBuilder.RenameColumn(
                name: "ClaimedQuantity",
                table: "SaleReturnClaims",
                newName: "Quantity");

            migrationBuilder.AddColumn<int>(
                name: "PreviousReturnId",
                table: "SaleReturns",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SourceEffectId",
                table: "SaleReturns",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "SaleItemId",
                table: "SaleReturnClaims",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "OffScopeKind",
                table: "SaleReturnClaims",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Problem",
                table: "SaleReturnClaims",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PreviousReturnId",
                table: "PurchaseReturns",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PurchaseReturnClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseReturnId = table.Column<int>(type: "int", nullable: false),
                    Scope = table.Column<int>(type: "int", nullable: false),
                    OffScopeKind = table.Column<int>(type: "int", nullable: true),
                    PurchaseItemId = table.Column<int>(type: "int", nullable: true),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Problem = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReturnClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnClaims_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnClaims_PurchaseItems_PurchaseItemId",
                        column: x => x.PurchaseItemId,
                        principalTable: "PurchaseItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnClaims_PurchaseReturns_PurchaseReturnId",
                        column: x => x.PurchaseReturnId,
                        principalTable: "PurchaseReturns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleReturnResolutions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleReturnClaimId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleReturnResolutions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleReturnResolutions_SaleReturnClaims_SaleReturnClaimId",
                        column: x => x.SaleReturnClaimId,
                        principalTable: "SaleReturnClaims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseReturnResolutions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseReturnClaimId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReturnResolutions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnResolutions_PurchaseReturnClaims_PurchaseReturnClaimId",
                        column: x => x.PurchaseReturnClaimId,
                        principalTable: "PurchaseReturnClaims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleReturnEffects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleReturnResolutionId = table.Column<int>(type: "int", nullable: false),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    DoneQuantity = table.Column<int>(type: "int", nullable: false),
                    RestockedQuantity = table.Column<int>(type: "int", nullable: true),
                    ProductId = table.Column<int>(type: "int", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(20,0)", nullable: true),
                    Method = table.Column<int>(type: "int", nullable: true),
                    Reference = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleReturnEffects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleReturnEffects_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SaleReturnEffects_SaleReturnResolutions_SaleReturnResolutionId",
                        column: x => x.SaleReturnResolutionId,
                        principalTable: "SaleReturnResolutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseReturnEffects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseReturnResolutionId = table.Column<int>(type: "int", nullable: false),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    DoneQuantity = table.Column<int>(type: "int", nullable: false),
                    RestockedQuantity = table.Column<int>(type: "int", nullable: true),
                    ProductId = table.Column<int>(type: "int", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(20,0)", nullable: true),
                    Method = table.Column<int>(type: "int", nullable: true),
                    Reference = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReturnEffects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnEffects_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnEffects_PurchaseReturnResolutions_PurchaseReturnResolutionId",
                        column: x => x.PurchaseReturnResolutionId,
                        principalTable: "PurchaseReturnResolutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleReturnEffectMoneyParts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleReturnEffectId = table.Column<int>(type: "int", nullable: false),
                    Method = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    CheckNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TransferRef = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleReturnEffectMoneyParts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleReturnEffectMoneyParts_SaleReturnEffects_SaleReturnEffectId",
                        column: x => x.SaleReturnEffectId,
                        principalTable: "SaleReturnEffects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleReturnEffectRounds",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleReturnEffectId = table.Column<int>(type: "int", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    HealthyQuantity = table.Column<int>(type: "int", nullable: true),
                    PartyName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PartyNationalId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VehiclePlate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleReturnEffectRounds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleReturnEffectRounds_SaleReturnEffects_SaleReturnEffectId",
                        column: x => x.SaleReturnEffectId,
                        principalTable: "SaleReturnEffects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseReturnEffectMoneyParts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseReturnEffectId = table.Column<int>(type: "int", nullable: false),
                    Method = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(20,0)", nullable: false),
                    CheckNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TransferRef = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReturnEffectMoneyParts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnEffectMoneyParts_PurchaseReturnEffects_PurchaseReturnEffectId",
                        column: x => x.PurchaseReturnEffectId,
                        principalTable: "PurchaseReturnEffects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseReturnEffectRounds",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseReturnEffectId = table.Column<int>(type: "int", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    HealthyQuantity = table.Column<int>(type: "int", nullable: true),
                    PartyName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PartyNationalId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VehiclePlate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReturnEffectRounds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnEffectRounds_PurchaseReturnEffects_PurchaseReturnEffectId",
                        column: x => x.PurchaseReturnEffectId,
                        principalTable: "PurchaseReturnEffects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleReturnEffectObservations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleReturnEffectRoundId = table.Column<int>(type: "int", nullable: false),
                    Problem = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleReturnEffectObservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleReturnEffectObservations_SaleReturnEffectRounds_SaleReturnEffectRoundId",
                        column: x => x.SaleReturnEffectRoundId,
                        principalTable: "SaleReturnEffectRounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseReturnEffectObservations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseReturnEffectRoundId = table.Column<int>(type: "int", nullable: false),
                    Problem = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReturnEffectObservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnEffectObservations_PurchaseReturnEffectRounds_PurchaseReturnEffectRoundId",
                        column: x => x.PurchaseReturnEffectRoundId,
                        principalTable: "PurchaseReturnEffectRounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturns_PreviousReturnId",
                table: "SaleReturns",
                column: "PreviousReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturns_PreviousReturnId",
                table: "PurchaseReturns",
                column: "PreviousReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnClaims_ProductId",
                table: "PurchaseReturnClaims",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnClaims_PurchaseItemId",
                table: "PurchaseReturnClaims",
                column: "PurchaseItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnClaims_PurchaseReturnId",
                table: "PurchaseReturnClaims",
                column: "PurchaseReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnEffectMoneyParts_PurchaseReturnEffectId",
                table: "PurchaseReturnEffectMoneyParts",
                column: "PurchaseReturnEffectId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnEffectObservations_PurchaseReturnEffectRoundId",
                table: "PurchaseReturnEffectObservations",
                column: "PurchaseReturnEffectRoundId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnEffectRounds_PurchaseReturnEffectId",
                table: "PurchaseReturnEffectRounds",
                column: "PurchaseReturnEffectId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnEffects_ProductId",
                table: "PurchaseReturnEffects",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnEffects_PurchaseReturnResolutionId",
                table: "PurchaseReturnEffects",
                column: "PurchaseReturnResolutionId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnResolutions_PurchaseReturnClaimId",
                table: "PurchaseReturnResolutions",
                column: "PurchaseReturnClaimId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnEffectMoneyParts_SaleReturnEffectId",
                table: "SaleReturnEffectMoneyParts",
                column: "SaleReturnEffectId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnEffectObservations_SaleReturnEffectRoundId",
                table: "SaleReturnEffectObservations",
                column: "SaleReturnEffectRoundId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnEffectRounds_SaleReturnEffectId",
                table: "SaleReturnEffectRounds",
                column: "SaleReturnEffectId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnEffects_ProductId",
                table: "SaleReturnEffects",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnEffects_SaleReturnResolutionId",
                table: "SaleReturnEffects",
                column: "SaleReturnResolutionId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnResolutions_SaleReturnClaimId",
                table: "SaleReturnResolutions",
                column: "SaleReturnClaimId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseReturns_PurchaseReturns_PreviousReturnId",
                table: "PurchaseReturns",
                column: "PreviousReturnId",
                principalTable: "PurchaseReturns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SaleReturns_SaleReturns_PreviousReturnId",
                table: "SaleReturns",
                column: "PreviousReturnId",
                principalTable: "SaleReturns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturns_PurchaseReturns_PreviousReturnId",
                table: "PurchaseReturns");

            migrationBuilder.DropForeignKey(
                name: "FK_SaleReturns_SaleReturns_PreviousReturnId",
                table: "SaleReturns");

            migrationBuilder.DropTable(
                name: "PurchaseReturnEffectMoneyParts");

            migrationBuilder.DropTable(
                name: "PurchaseReturnEffectObservations");

            migrationBuilder.DropTable(
                name: "SaleReturnEffectMoneyParts");

            migrationBuilder.DropTable(
                name: "SaleReturnEffectObservations");

            migrationBuilder.DropTable(
                name: "PurchaseReturnEffectRounds");

            migrationBuilder.DropTable(
                name: "SaleReturnEffectRounds");

            migrationBuilder.DropTable(
                name: "PurchaseReturnEffects");

            migrationBuilder.DropTable(
                name: "SaleReturnEffects");

            migrationBuilder.DropTable(
                name: "PurchaseReturnResolutions");

            migrationBuilder.DropTable(
                name: "SaleReturnResolutions");

            migrationBuilder.DropTable(
                name: "PurchaseReturnClaims");

            migrationBuilder.DropIndex(
                name: "IX_SaleReturns_PreviousReturnId",
                table: "SaleReturns");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseReturns_PreviousReturnId",
                table: "PurchaseReturns");

            migrationBuilder.DropColumn(
                name: "PreviousReturnId",
                table: "SaleReturns");

            migrationBuilder.DropColumn(
                name: "SourceEffectId",
                table: "SaleReturns");

            migrationBuilder.DropColumn(
                name: "OffScopeKind",
                table: "SaleReturnClaims");

            migrationBuilder.DropColumn(
                name: "Problem",
                table: "SaleReturnClaims");

            migrationBuilder.DropColumn(
                name: "PreviousReturnId",
                table: "PurchaseReturns");

            migrationBuilder.RenameColumn(
                name: "Scope",
                table: "SaleReturnClaims",
                newName: "Reason");

            migrationBuilder.RenameColumn(
                name: "Quantity",
                table: "SaleReturnClaims",
                newName: "ClaimedQuantity");

            migrationBuilder.AlterColumn<int>(
                name: "SaleItemId",
                table: "SaleReturnClaims",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "PurchaseReturnItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    PurchaseItemId = table.Column<int>(type: "int", nullable: false),
                    PurchaseReturnId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IssueType = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(20,0)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReturnItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnItems_PurchaseItems_PurchaseItemId",
                        column: x => x.PurchaseItemId,
                        principalTable: "PurchaseItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnItems_PurchaseReturns_PurchaseReturnId",
                        column: x => x.PurchaseReturnId,
                        principalTable: "PurchaseReturns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleReturnItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleReturnClaimId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IssueType = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleReturnItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleReturnItems_SaleReturnClaims_SaleReturnClaimId",
                        column: x => x.SaleReturnClaimId,
                        principalTable: "SaleReturnClaims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseReturnDecisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseReturnItemId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DecisionType = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    RefundAmount = table.Column<decimal>(type: "decimal(20,0)", nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReturnDecisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnDecisions_PurchaseReturnItems_PurchaseReturnItemId",
                        column: x => x.PurchaseReturnItemId,
                        principalTable: "PurchaseReturnItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleReturnDecisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleReturnItemId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DecisionType = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    RefundAmount = table.Column<decimal>(type: "decimal(20,0)", nullable: true),
                    ReplacementShippedQuantity = table.Column<int>(type: "int", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleReturnDecisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleReturnDecisions_SaleReturnItems_SaleReturnItemId",
                        column: x => x.SaleReturnItemId,
                        principalTable: "SaleReturnItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnDecisions_PurchaseReturnItemId",
                table: "PurchaseReturnDecisions",
                column: "PurchaseReturnItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItems_ProductId",
                table: "PurchaseReturnItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItems_PurchaseItemId",
                table: "PurchaseReturnItems",
                column: "PurchaseItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItems_PurchaseReturnId",
                table: "PurchaseReturnItems",
                column: "PurchaseReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnDecisions_SaleReturnItemId",
                table: "SaleReturnDecisions",
                column: "SaleReturnItemId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleReturnItems_SaleReturnClaimId",
                table: "SaleReturnItems",
                column: "SaleReturnClaimId");
        }
    }
}
