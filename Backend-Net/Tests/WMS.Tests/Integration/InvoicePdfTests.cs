using Application.Features.Invoice.Queries;
using Application.Features.SaleReturn.Commands;
using Application.Features.SaleReturn.Dtos;
using Domain.Enums;
using Microsoft.Extensions.Configuration;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// End-to-end through real seeded entities rather than hand-built models - catches mapping
    /// mistakes (wrong navigation property, null Product on a claim) that the isolated
    /// PdfAndBarcodeSmokeTests can't, since those build InvoiceDocumentModel by hand.
    /// </summary>
    public class InvoicePdfTests
    {
        private static IConfiguration EmptyConfig() => new ConfigurationBuilder().Build();

        [Fact]
        public async Task GetSaleInvoicePdf_ProducesNonEmptyPdf()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 3, shippedQuantity: 3, stock: 0);

            var handler = new GetSaleInvoicePdfQueryHandler(scope.Db, scope.PdfDocumentService, scope.InvoiceLineCalculation, EmptyConfig());
            var file = await handler.Handle(new GetSaleInvoicePdfQuery { SaleId = scenario.Sale.Id }, CancellationToken.None);

            Assert.NotEmpty(file.Content);
            Assert.Equal("application/pdf", file.ContentType);
            Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(file.Content, 0, 4));
        }

        [Fact]
        public async Task GetPurchaseInvoicePdf_ProducesNonEmptyPdf()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 3, stock: 0);

            var handler = new GetPurchaseInvoicePdfQueryHandler(scope.Db, scope.PdfDocumentService, scope.InvoiceLineCalculation, EmptyConfig());
            var file = await handler.Handle(new GetPurchaseInvoicePdfQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None);

            Assert.NotEmpty(file.Content);
            Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(file.Content, 0, 4));
        }

        [Fact]
        public async Task GetSaleReturnCreditNotePdf_ProducesNonEmptyPdf()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0);

            var createHandler = new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork);
            var createRes = await createHandler.Handle(new CreateSaleReturnCommand
            {
                SaleId = scenario.Sale.Id,
                Claims = new() { new CreateSaleReturnClaimDto { SaleItemId = scenario.Item.Id, Reason = SalesReturnReasonEnum.DEFECTIVE, ClaimedQuantity = 5 } },
            }, CancellationToken.None);
            var saleReturnId = (int)createRes.Data!.GetType().GetProperty("ReturnId")!.GetValue(createRes.Data)!;
            var claimId = scope.Context.SaleReturnClaims.Single().Id;

            var inspectHandler = new ConfirmReturnInspectionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.ProductUnitService, scope.UnitOfWork);
            await inspectHandler.Handle(new ConfirmReturnInspectionCommand
            {
                SaleReturnId = saleReturnId,
                Claims = new()
                {
                    new ConfirmReturnInspectionClaimDto
                    {
                        SaleReturnClaimId = claimId,
                        Results = new() { new ConfirmReturnInspectionResultDto { IssueType = SalesReturnIssueTypeEnum.DEFECTIVE, Quantity = 5 } },
                    },
                },
            }, CancellationToken.None);
            var saleReturnItemId = scope.Context.SaleReturnItems.Single().Id;

            var decisionHandler = new AddSaleReturnDecisionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.UnitOfWork);
            await decisionHandler.Handle(new AddSaleReturnDecisionCommand
            {
                SaleReturnItemId = saleReturnItemId,
                DecisionType = SaleReturnDecisionTypeEnum.REFUND,
                Quantity = 5,
            }, CancellationToken.None);

            var pdfHandler = new GetSaleReturnCreditNotePdfQueryHandler(scope.Db, scope.SaleReturnQueryService, scope.PdfDocumentService, EmptyConfig());
            var file = await pdfHandler.Handle(new GetSaleReturnCreditNotePdfQuery { SaleReturnId = saleReturnId }, CancellationToken.None);

            Assert.NotEmpty(file.Content);
            Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(file.Content, 0, 4));
        }
    }
}
