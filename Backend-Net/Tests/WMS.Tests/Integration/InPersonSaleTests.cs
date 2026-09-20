using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.SaleInstallment.Commands;
using Application.Ioc;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// فروش حضوری: مشتری سر پیشخوان تسویه می‌کند و کالا را می‌برد. «تسویه» برای فروش نقدی یعنی کل
    /// مبلغ و برای فروش اقساطی یعنی پیش‌پرداخت — هر دو فروش را از پیش‌فاکتور خارج می‌کنند و شماره‌ی
    /// فاکتور رسمی می‌گیرند.
    /// </summary>
    public class InPersonSaleTests
    {
        /// <summary>خط لوله‌ی واقعی MediatR روی کانتکست همین scope — عیناً مثل ShipmentTests.</summary>
        private static IMediator Mediator(TestScope scope)
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddApplicationServices();
            services.AddSingleton<IWMSDbContext>(scope.Context);
            services.AddSingleton(scope.UnitOfWork);
            services.AddSingleton(scope.PurchaseReturnCalculation);
            services.AddSingleton(scope.SaleReturnCalculation);
            services.AddSingleton(scope.PurchaseReturnRepository);
            services.AddSingleton(scope.SaleReturnRepository);
            services.AddSingleton(scope.SaleInstallmentPlanRepository);
            services.AddSingleton(scope.ProductUnitService);
            services.AddSingleton(scope.InventoryCostingService);
            services.AddSingleton(scope.ProductCodeService);
            services.AddSingleton<IObjectStorageService>(FakeObjectStorage.Instance);
            services.AddSingleton(FakeUserContext.WithUserId());
            return services.BuildServiceProvider().GetRequiredService<IMediator>();
        }

        private static CreateSaleCommand SaleBody(SaleScenario scenario, PaymentTypeEnum paymentType, ulong totalAmount, ulong paidAmount) => new()
        {
            InvoiceDate = DateTime.Now,
            Status = SalesStatusEnum.PROFORMA,
            PaymentType = paymentType,
            PaymentDetails = new(),
            TotalAmount = totalAmount,
            PaidAmount = paidAmount,
            CustomerId = scenario.Customer.Id,
            ProductIds = new()
            {
                new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = totalAmount, Discount = 0 },
            },
        };

        private static CreateSaleInstallmentPlanCommand PlanBody(ulong downPaymentAmount) => new()
        {
            // نقدی ۱۰٬۰۰۰٬۰۰۰ با ۲۰٪ افزایش = ۱۲٬۰۰۰٬۰۰۰
            CashAmount = 10_000_000,
            MarkupPercentage = 20m,
            TotalAmount = 12_000_000,
            DownPaymentAmount = downPaymentAmount,
            InstallmentCount = 5,
            FirstDueDate = DateTime.Now.AddMonths(1),
            PaymentType = PaymentTypeEnum.CASH,
        };

        [Fact]
        public async Task InPersonSale_PaidInFull_IsDeliveredWithInvoiceNumber()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 5, unitPrice: 12_000_000);
            Seed.PersistedUser(scope.Context);

            var res = await Mediator(scope).Send(new CreateInPersonSaleCommand
            {
                Sale = SaleBody(scenario, PaymentTypeEnum.CASH, 12_000_000, 12_000_000),
            });

            var created = Assert.IsType<CreatedSaleDto>(res.Data);
            Assert.Equal(SalesStatusEnum.DELIVERED, created.Status);
            Assert.False(string.IsNullOrEmpty(created.InvoiceNumber));

            using var verify = db.NewContext();
            var sale = verify.Sales.Include(x => x.Items).Single(x => x.Id == created.Id);
            Assert.Equal(SalesStatusEnum.DELIVERED, sale.Status);
            Assert.Equal(1, Assert.Single(sale.Items).ShippedQuantity);
            // یک واحد از موجودی ۵تایی خارج شده است.
            Assert.Equal(4, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task InPersonInstallmentSale_WithDownPayment_IsDeliveredWithPlanAndInvoiceNumber()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 5, unitPrice: 12_000_000);
            Seed.PersistedUser(scope.Context);

            var res = await Mediator(scope).Send(new CreateInPersonSaleCommand
            {
                Sale = SaleBody(scenario, PaymentTypeEnum.INSTALLMENT, 12_000_000, 0),
                InstallmentPlan = PlanBody(downPaymentAmount: 2_000_000),
            });

            var created = Assert.IsType<CreatedSaleDto>(res.Data);
            Assert.Equal(SalesStatusEnum.DELIVERED, created.Status);
            // پیش‌پرداخت — نه پرداخت کامل — فاکتور رسمی را صادر کرده است.
            Assert.False(string.IsNullOrEmpty(created.InvoiceNumber));

            using var verify = db.NewContext();
            var sale = verify.Sales.Include(x => x.Items).Single(x => x.Id == created.Id);
            Assert.Equal(SalesStatusEnum.DELIVERED, sale.Status);
            Assert.Equal(2_000_000UL, sale.PaidAmount);
            Assert.Equal(1, Assert.Single(sale.Items).ShippedQuantity);
            Assert.Equal(4, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);

            var plan = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.SaleId == created.Id);
            Assert.Equal(5, plan.Installments.Count);
            Assert.Equal(10_000_000UL, plan.FinancedAmount);
            Assert.Equal(PaymentPurposeEnum.INSTALLMENT_DOWN_PAYMENT, verify.PaymentDetails.Single(x => x.SaleId == created.Id).Purpose);
        }

        [Fact]
        public async Task InPersonInstallmentSale_WithoutPlan_IsRejected()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 5, unitPrice: 12_000_000);
            Seed.PersistedUser(scope.Context);

            // بدون قرارداد، فروش در پیش‌فاکتور می‌ماند در حالی که کالا از انبار خارج شده است.
            await Assert.ThrowsAsync<ValidationCustomException>(() => Mediator(scope).Send(new CreateInPersonSaleCommand
            {
                Sale = SaleBody(scenario, PaymentTypeEnum.INSTALLMENT, 12_000_000, 0),
            }));

            using var verify = db.NewContext();
            Assert.Equal(5, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task InPersonInstallmentSale_WithZeroDownPayment_IsRejected()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 5, unitPrice: 12_000_000);
            Seed.PersistedUser(scope.Context);

            // پیش‌فاکتور یعنی خریدی که حتی یک ریال بابتش پرداخت نشده؛ کالا با آن تحویل نمی‌شود.
            await Assert.ThrowsAsync<ValidationCustomException>(() => Mediator(scope).Send(new CreateInPersonSaleCommand
            {
                Sale = SaleBody(scenario, PaymentTypeEnum.INSTALLMENT, 12_000_000, 0),
                InstallmentPlan = PlanBody(downPaymentAmount: 0),
            }));

            using var verify = db.NewContext();
            Assert.Equal(5, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
        }
    }
}
