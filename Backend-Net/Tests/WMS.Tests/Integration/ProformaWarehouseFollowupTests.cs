using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// docs/frontend-requests.fa.md section 24: warehouse adjustments inside CheckSaleWarehouse, the invoice date and payment
    /// type set when the invoice is issued, the in-person proforma and the manual reservation release.
    /// </summary>
    public class ProformaWarehouseFollowupTests
    {
        private static async Task<(MediatR.IMediator Mediator, SaleScenario Scenario, List<string> Barcodes)> SetupAsync(TestScope scope, int stock)
        {
            var user = Seed.PersistedUser(scope.Context);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var barcodes = await ProformaFlow.ScannableStockAsync(scope, scenario.Product, stock);
            return (ProformaFlow.Mediator(scope, user.Id), scenario, barcodes);
        }

        private static CancellationToken Ct => TestContext.Current.CancellationToken;

        [Fact]
        public async Task WarehouseAdjustment_LowersTheLine_AndApprovesInOneStep()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 3);
            var sale = await ProformaFlow.ApproveAsync(mediator, await ProformaFlow.CreateAsync(mediator, scenario, quantity: 3));
            var line = sale.Items.Single();
            var revision = sale.Revision;

            sale = Assert.IsType<SaleDto>((await mediator.Send(new CheckSaleWarehouseCommand
            {
                SaleId = sale.Id,
                Revision = sale.Revision,
                Adjustments = new() { new SaleWarehouseAdjustmentDto { SaleItemId = line.Id, Quantity = 1 } },
                Lines = new() { new CheckSaleWarehouseLineDto { SaleItemId = line.Id, ProductUnitBarcodes = new() { barcodes[0] } } },
                Note = "یک عدد سالم بیشتر نبود",
            }, Ct)).Data);

            Assert.Equal(SaleProformaStageEnum.WAREHOUSE_CHECKED, sale.ProformaStage);
            Assert.Equal(revision + 1, sale.Revision);
            Assert.Equal(1, sale.Items.Single().Quantity);
            Assert.Equal(1, sale.Items.Single().ReservedQuantity);
            Assert.Equal(sale.Items.Single().TotalAmount, sale.TotalAmount);
            var last = sale.ProformaEvents.Last();
            Assert.Equal(SaleProformaEventEnum.WAREHOUSE_ADJUSTED, last.Kind);
            Assert.Contains("یک عدد سالم بیشتر نبود", last.Note);
            Assert.Equal(1, sale.ProformaEvents.Count(e => e.Kind != SaleProformaEventEnum.CUSTOMER_APPROVED));
        }

        [Fact]
        public async Task WarehouseAdjustment_Refusals_LeaveTheProformaAsItWas()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 3);
            var sale = await ProformaFlow.ApproveAsync(mediator, await ProformaFlow.CreateAsync(mediator, scenario, quantity: 2));
            var line = sale.Items.Single();

            CheckSaleWarehouseCommand Command(int quantity, int scanned, string? note = "کم بود") => new()
            {
                SaleId = sale.Id,
                Revision = sale.Revision,
                Adjustments = new() { new SaleWarehouseAdjustmentDto { SaleItemId = line.Id, Quantity = quantity } },
                Lines = scanned == 0 ? new() : new() { new CheckSaleWarehouseLineDto { SaleItemId = line.Id, ProductUnitBarcodes = barcodes.Take(scanned).ToList() } },
                Note = note,
            };

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(Command(1, 1, note: null), Ct)); // no reason
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(Command(2, 2), Ct));             // not lower
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(Command(0, 0), Ct));             // last line
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(Command(1, 0), Ct));             // still short

            var after = await ProformaFlow.DetailAsync(mediator, sale.Id);
            Assert.Equal(SaleProformaStageEnum.CUSTOMER_APPROVED, after.ProformaStage);
            Assert.Equal(2, after.Items.Single().Quantity);
        }

        [Fact]
        public async Task IssuingPayment_TakesTheInvoiceDate_AndNamesHowItWasPaid()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(1).ToList(), paymentType: PaymentTypeEnum.CREDIT);
            var invoiceDate = DateTime.Today.AddDays(-3);

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new AddSalePaymentCommand
            {
                SaleId = sale.Id, Type = PaymentTypeEnum.CASH, Amount = sale.TotalAmount, InvoiceDate = DateTime.Today.AddDays(1),
            }, Ct));

            sale = Assert.IsType<SaleDto>((await mediator.Send(new AddSalePaymentCommand
            {
                SaleId = sale.Id, Type = PaymentTypeEnum.CASH, Amount = sale.TotalAmount, InvoiceDate = invoiceDate,
            }, Ct)).Data);

            Assert.Equal(SalesStatusEnum.PROCESSING, sale.Status);
            Assert.Equal(invoiceDate, sale.InvoiceDate);
            Assert.Equal(PaymentTypeEnum.CASH, sale.PaymentType);
        }

        [Fact]
        public async Task PartialIssuingPayment_KeepsTheChosenPaymentType()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(2).ToList(), paymentType: PaymentTypeEnum.CREDIT);

            sale = Assert.IsType<SaleDto>((await mediator.Send(new AddSalePaymentCommand { SaleId = sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1 }, Ct)).Data);

            Assert.Equal(SalesStatusEnum.PROCESSING, sale.Status);
            Assert.Equal(PaymentTypeEnum.CREDIT, sale.PaymentType);
            Assert.NotNull(sale.InvoiceDate);
        }

        [Fact]
        public async Task InPersonProforma_ScansAndReservesAtTheCounter()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 3);

            CreateInPersonProformaCommand Command(int scanned) => new()
            {
                CustomerId = scenario.Customer.Id,
                PaymentType = PaymentTypeEnum.CASH,
                Items = new() { new InPersonProformaItemDto { ProductId = scenario.Product.Id, Quantity = 2, UnitPrice = 1_000, ProductUnitBarcodes = barcodes.Take(scanned).ToList() } },
            };

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(Command(1), Ct));

            var sale = Assert.IsType<SaleDto>((await mediator.Send(Command(2), Ct)).Data);
            Assert.True(sale.IsInPerson);
            Assert.Equal(SaleProformaStageEnum.WAREHOUSE_CHECKED, sale.ProformaStage);
            Assert.Equal(2, sale.Items.Single().ReservedQuantity);

            using var verify = db.NewContext();
            Assert.Equal(1, verify.Sales.Count(s => s.IsInPerson));
            Assert.Equal(1, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task ManualRelease_PutsTheUnitsBack_AndTheWarehouseChecksAgain()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(2).ToList());
            var lineId = sale.Items.Single().Id;

            sale = Assert.IsType<SaleDto>((await mediator.Send(new ReleaseSaleReservationCommand { SaleId = sale.Id, Revision = sale.Revision }, Ct)).Data);

            Assert.Equal(SaleProformaStageEnum.CUSTOMER_APPROVED, sale.ProformaStage);
            Assert.Equal(SaleProformaEventEnum.RESERVATION_RELEASED, sale.ProformaEvents.Last().Kind);
            Assert.Equal(lineId, sale.Items.Single().Id);
            Assert.Equal(0, sale.Items.Single().ReservedQuantity);
            Assert.Null(sale.ReservationExpiresAt);

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new ReleaseSaleReservationCommand { SaleId = sale.Id, Revision = sale.Revision }, Ct));

            using var verify = db.NewContext();
            Assert.Equal(2, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
        }
    }
}
