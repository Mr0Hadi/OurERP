using Application.Common.Dtos.Returns;
using Application.Features.Invoice.Queries;
using Application.Features.SaleReturn.Commands;
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
                Claims = new()
                {
                    new CreateReturnClaimDto
                    {
                        Scope = ReturnClaimScopeEnum.ON_ORDER,
                        OrderLineId = scenario.Item.Id,
                        ProductId = scenario.Product.Id,
                        UnitPrice = scenario.Item.UnitPrice,
                        Quantity = 5,
                        Problem = ReturnProblemEnum.DEFECTIVE,
                    },
                },
            }, CancellationToken.None);
            var saleReturnId = (int)createRes.Data!.GetType().GetProperty("ReturnId")!.GetValue(createRes.Data)!;
            var claimId = scope.Context.SaleReturnClaims.Single().Id;

            var decisionHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);
            await decisionHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 5,
                    Money = new MoneyEffectDto { Kind = ReturnEffectKindEnum.MONEY_OUT, Method = ReturnPaymentMethodEnum.CASH, Amount = 5 * scenario.Item.UnitPrice },
                },
            }, CancellationToken.None);

            var pdfHandler = new GetSaleReturnCreditNotePdfQueryHandler(scope.Db, scope.SaleReturnQueryService, scope.PdfDocumentService, EmptyConfig());
            var file = await pdfHandler.Handle(new GetSaleReturnCreditNotePdfQuery { SaleReturnId = saleReturnId }, CancellationToken.None);

            Assert.NotEmpty(file.Content);
            Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(file.Content, 0, 4));
        }
    }
}
