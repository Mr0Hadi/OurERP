using Application.Common.Dtos.Returns;
using Application.Features.Invoice.Dtos;
using Application.Features.Invoice.Queries;
using Application.Features.SaleReturn.Commands;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// docs/frontend-requests.fa.md section 27: the print data of the three official documents, built by the same
    /// InvoiceDocumentBuilder the PDFs render. No LibreOffice needed - nothing is rendered here.
    /// </summary>
    public class InvoiceDocumentTests
    {
        private static CancellationToken Ct => TestContext.Current.CancellationToken;

        [Fact]
        public async Task SaleInvoiceDocument_CarriesTheStoredLineAmounts_AndPersianLabels()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 3, shippedQuantity: 3, stock: 0);
            var item = scope.Context.SaleItems.Single(x => x.Id == scenario.Item.Id);

            var doc = Assert.IsType<InvoiceDocumentDto>((await new GetSaleInvoiceDocumentQueryHandler(scope.Db)
                .Handle(new GetSaleInvoiceDocumentQuery { SaleId = scenario.Sale.Id }, Ct)).Data);

            Assert.False(doc.IsProforma);
            Assert.Equal("فاکتور فروش", doc.Title);
            Assert.NotNull(doc.StatusText);
            Assert.DoesNotContain(doc.StatusText ?? string.Empty, Enum.GetNames<SalesStatusEnum>());
            var line = Assert.Single(doc.Lines);
            Assert.Equal(item.GrossAmount, line.GrossAmount);
            Assert.Equal(item.NetAmount, line.NetAmount);
            Assert.Equal(item.TaxPercent, line.TaxPercent);
            Assert.Equal(item.TotalAmount, line.LineTotal);
            Assert.False(string.IsNullOrWhiteSpace(line.Unit));
            Assert.Equal(scenario.Sale.TotalAmount, doc.GrandTotal);
        }

        [Fact]
        public async Task ProformaDocument_IsTitledAsAProforma_WithNotesApartFromTheDescription()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.InvoiceNumber = "";
            scenario.Sale.PaymentDate = DateTime.Today.AddDays(30);
            scenario.Sale.Description = "تحویل درب انبار";
            scope.Context.SaveChanges();

            var doc = Assert.IsType<InvoiceDocumentDto>((await new GetSaleInvoiceDocumentQueryHandler(scope.Db)
                .Handle(new GetSaleInvoiceDocumentQuery { SaleId = scenario.Sale.Id }, Ct)).Data);

            Assert.True(doc.IsProforma);
            Assert.Equal("پیش‌فاکتور فروش", doc.Title);
            Assert.Null(doc.DocumentNumber);
            Assert.Equal("تحویل درب انبار", doc.Description);
            Assert.Contains(doc.Notes, n => n.StartsWith("مهلت پرداخت"));
            Assert.DoesNotContain(doc.Notes, n => n.Contains("تحویل درب انبار"));
        }

        [Fact]
        public async Task CreditNoteDocument_RefusesAReturnWithNoMoneyBack_AndListsTheRefunds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0);

            var created = await new CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new CreateSaleReturnCommand
                {
                    SaleId = scenario.Sale.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 5, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, Ct);
            var saleReturnId = ((Application.Features.SaleReturn.Dtos.SaleReturnDetailDto)created.Data!).Id;
            var query = new GetSaleReturnCreditNoteDocumentQuery { SaleReturnId = saleReturnId };

            await Assert.ThrowsAsync<ValidationCustomException>(() => new GetSaleReturnCreditNoteDocumentQueryHandler(scope.Db).Handle(query, Ct));

            await new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new AddClaimResolutionCommand
                {
                    ClaimId = scope.Context.SaleReturnClaims.Single().Id,
                    Composition = new EffectCompositionDto { Quantity = 5, MoneyOut = new MoneyEffectDto { PaidAt = DateTime.Now, Method = ReturnPaymentMethodEnum.CASH, Amount = 5 * scenario.Item.UnitPrice } },
                }, Ct);

            var doc = Assert.IsType<InvoiceDocumentDto>((await new GetSaleReturnCreditNoteDocumentQueryHandler(scope.Db).Handle(query, Ct)).Data);
            var line = Assert.Single(doc.Lines);
            Assert.False(doc.IsProforma);
            Assert.Equal(5 * scenario.Item.UnitPrice, line.LineTotal);
            Assert.Equal(line.LineTotal, line.GrossAmount);
            Assert.Equal(line.LineTotal, line.NetAmount);
            Assert.Equal(0, line.TaxPercent);
            Assert.Contains(doc.Notes, n => n.Contains("فاکتور فروش"));
        }

        [Fact]
        public async Task Documents_ForAMissingRecord_Are404()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            await Assert.ThrowsAsync<NotFoundCustomException>(() => new GetSaleInvoiceDocumentQueryHandler(scope.Db).Handle(new GetSaleInvoiceDocumentQuery { SaleId = 999_999 }, Ct));
            await Assert.ThrowsAsync<NotFoundCustomException>(() => new GetPurchaseReturnDocumentQueryHandler(scope.Db).Handle(new GetPurchaseReturnDocumentQuery { PurchaseReturnId = 999_999 }, Ct));
        }
    }
}
