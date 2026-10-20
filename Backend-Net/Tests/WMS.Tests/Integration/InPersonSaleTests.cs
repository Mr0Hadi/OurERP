using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.SaleInstallment.Commands;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// فروش حضوری همان خط لوله‌ی پیش‌فاکتور را طی می‌کند (ثبت، تأیید مشتری، اسکن و رزرو انبار) و بعد
    /// CompleteInPersonSale پرداخت (کامل، یا پیش‌پرداخت اقساطی) + ارسال دانه‌های رزروشده + تحویل را یک‌جا انجام می‌دهد.
    /// </summary>
    public class InPersonSaleTests
    {
        private static CreateSaleInstallmentPlanCommand PlanBody(ulong downPaymentAmount) => new()
        {
            // جمع فاکتور ۱۰٬۰۰۰٬۰۰۰ با ۲۰٪ سود اقساط = ۱۲٬۰۰۰٬۰۰۰ قابل پرداخت (سرور حساب می‌کند)
            MarkupPercentage = 20m,
            DownPaymentAmount = downPaymentAmount,
            InstallmentCount = 5,
            FirstDueDate = DateTime.Now.AddMonths(1),
            PaymentType = PaymentTypeEnum.CASH,
        };

        [Fact]
        public async Task InPersonSale_PaidInFull_ShipsTheReservedUnits_AndIsDelivered()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = Seed.PersistedUser(scope.Context);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var barcodes = await ProformaFlow.ScannableStockAsync(scope, scenario.Product, 3);
            var mediator = ProformaFlow.Mediator(scope, user.Id);

            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(1).ToList(), unitPrice: 12_000_000);

            var res = await mediator.Send(new CompleteInPersonSaleCommand
            {
                SaleId = sale.Id,
                Payments = new() { new InPersonPaymentDto { Type = PaymentTypeEnum.CASH, Amount = sale.TotalAmount } },
            }, TestContext.Current.CancellationToken);

            var completed = Assert.IsType<CreatedSaleDto>(res.Data);
            Assert.Equal(SalesStatusEnum.DELIVERED, completed.Status);
            Assert.False(string.IsNullOrEmpty(completed.InvoiceNumber));

            using var verify = db.NewContext();
            Assert.Equal(1, verify.SaleItems.Single(x => x.SaleId == sale.Id).ShippedQuantity);
            // The scanned unit, not some other one, left the warehouse; Stock dropped once (at reservation), not twice.
            Assert.Equal(ProductUnitStatusEnum.SOLD, verify.ProductUnits.Single(u => u.Barcode == barcodes[0]).Status);
            Assert.Equal(2, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task InPersonInstallmentSale_WithDownPayment_IsDeliveredWithPlanAndInvoiceNumber()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = Seed.PersistedUser(scope.Context);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var barcodes = await ProformaFlow.ScannableStockAsync(scope, scenario.Product, 1);
            var mediator = ProformaFlow.Mediator(scope, user.Id);

            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes, unitPrice: 10_000_000, paymentType: PaymentTypeEnum.INSTALLMENT);

            var completed = Assert.IsType<CreatedSaleDto>((await mediator.Send(new CompleteInPersonSaleCommand
            {
                SaleId = sale.Id,
                InstallmentPlan = PlanBody(downPaymentAmount: 2_000_000),
            }, TestContext.Current.CancellationToken)).Data);

            Assert.Equal(SalesStatusEnum.DELIVERED, completed.Status);
            // پیش‌پرداخت — نه پرداخت کامل — فاکتور رسمی را صادر کرده است.
            Assert.False(string.IsNullOrEmpty(completed.InvoiceNumber));

            using var verify = db.NewContext();
            Assert.Equal(2_000_000UL, verify.Sales.Single(x => x.Id == sale.Id).PaidAmount);
            Assert.Equal(0, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
            var plan = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.SaleId == sale.Id);
            Assert.Equal(5, plan.Installments.Count);
            Assert.Equal(10_000_000UL, plan.FinancedAmount);
        }

        [Fact]
        public async Task InPersonSale_BeforeTheWarehouseCheck_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = Seed.PersistedUser(scope.Context);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            await ProformaFlow.ScannableStockAsync(scope, scenario.Product, 1);
            var mediator = ProformaFlow.Mediator(scope, user.Id);

            var sale = await ProformaFlow.ApproveAsync(mediator, await ProformaFlow.CreateAsync(mediator, scenario, 1));

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new CompleteInPersonSaleCommand
            {
                SaleId = sale.Id,
                Payments = new() { new InPersonPaymentDto { Type = PaymentTypeEnum.CASH, Amount = sale.TotalAmount } },
            }, TestContext.Current.CancellationToken));
        }

        [Fact]
        public async Task InPersonSale_PartialPayment_IsRefused_AndNothingMoves()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = Seed.PersistedUser(scope.Context);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var barcodes = await ProformaFlow.ScannableStockAsync(scope, scenario.Product, 1);
            var mediator = ProformaFlow.Mediator(scope, user.Id);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes);

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new CompleteInPersonSaleCommand
            {
                SaleId = sale.Id,
                Payments = new() { new InPersonPaymentDto { Type = PaymentTypeEnum.CASH, Amount = sale.TotalAmount - 1 } },
            }, TestContext.Current.CancellationToken));

            using var verify = db.NewContext();
            Assert.Equal(SalesStatusEnum.PROFORMA, verify.Sales.Single(x => x.Id == sale.Id).Status);
            Assert.Equal(ProductUnitStatusEnum.RESERVED, verify.ProductUnits.Single(u => u.Barcode == barcodes[0]).Status);
        }

        [Fact]
        public async Task InPersonInstallmentSale_WithoutPlan_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = Seed.PersistedUser(scope.Context);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var barcodes = await ProformaFlow.ScannableStockAsync(scope, scenario.Product, 1);
            var mediator = ProformaFlow.Mediator(scope, user.Id);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes, paymentType: PaymentTypeEnum.INSTALLMENT);

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new CompleteInPersonSaleCommand { SaleId = sale.Id }, TestContext.Current.CancellationToken));
        }

        [Fact]
        public async Task InPersonInstallmentSale_WithZeroDownPayment_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = Seed.PersistedUser(scope.Context);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var barcodes = await ProformaFlow.ScannableStockAsync(scope, scenario.Product, 1);
            var mediator = ProformaFlow.Mediator(scope, user.Id);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes, paymentType: PaymentTypeEnum.INSTALLMENT);

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new CompleteInPersonSaleCommand
            {
                SaleId = sale.Id,
                InstallmentPlan = PlanBody(downPaymentAmount: 0),
            }, TestContext.Current.CancellationToken));
        }
    }
}
