using Application.Common.Dtos;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Sale.Queries;
using Application.Features.SaleInstallment.Commands;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Server-computed line amounts, tax snapshots and document totals (InvoiceLineMath), and the installment charge kept
    /// apart from the invoice total.
    /// </summary>
    public class InvoiceAmountsTests
    {
        private static CreateSaleCommandHandler CreateSale(TestScope scope, int userId) =>
            new(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance, FakeUserContext.WithUserId(userId));

        private static UpdateSaleCommandHandler UpdateSale(TestScope scope) =>
            new(scope.Db, FakeObjectStorage.Instance, scope.SaleInstallmentPlanRepository, scope.UnitOfWork, TestMapper.Instance);

        private static async Task<SaleDto> DetailAsync(TestDatabase db, int saleId)
        {
            using var read = db.NewScope();
            return Assert.IsType<SaleDto>((await new GetSaleDetailQueryHandler(read.Db, FakeObjectStorage.Instance)
                .Handle(new GetSaleDetailQuery { Id = saleId }, CancellationToken.None)).Data);
        }

        [Fact]
        public async Task CreateSale_StampsEachLineWithTheProductsTax_AndComputesTheTotal()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            scenario.Product.Tax = 10;
            var exempt = Seed.Product(scenario.Product.ProductCategory, "کالای معاف");
            exempt.Tax = 9;
            exempt.TaxCategory = TaxCategoryEnum.EXEMPT;
            scope.Context.Products.Add(exempt);
            scope.Context.SaveChanges();
            var user = Seed.PersistedUser(scope.Context);

            var created = await CreateSale(scope, user.Id).Handle(new CreateSaleCommand
            {
                CustomerId = scenario.Customer.Id,
                PaymentType = PaymentTypeEnum.CASH,
                ProductIds = new()
                {
                    new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = 3, UnitPrice = 333_333, Discount = 7 },
                    new CreateSaleItemDto { ProductId = exempt.Id, Quantity = 2, UnitPrice = 1_000 },
                },
            }, CancellationToken.None);

            var dto = await DetailAsync(db, Assert.IsType<CreatedSaleDto>(created.Data).Id);
            var taxed = dto.Items.Single(i => i.ProductId == scenario.Product.Id);
            Assert.Equal((999_999UL, 70_000UL, 929_999UL, 93_000UL, 1_022_999UL), (taxed.GrossAmount, taxed.DiscountAmount, taxed.NetAmount, taxed.TaxAmount, taxed.TotalAmount));
            Assert.Equal(10, taxed.TaxPercent);
            var free = dto.Items.Single(i => i.ProductId == exempt.Id);
            Assert.Equal((TaxCategoryEnum.EXEMPT, 0, 0UL, 2_000UL), (free.TaxCategory, free.TaxPercent, free.TaxAmount, free.TotalAmount));
            Assert.Equal(1_024_999UL, dto.TotalAmount);
            Assert.Equal(dto.TotalAmount, dto.PayableAmount);
        }

        [Fact]
        public async Task Proforma_RereadsTheProductsTaxOnSave_IssuedInvoice_KeepsItsSnapshot()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0, unitPrice: 1_000);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.InvoiceNumber = "";
            scenario.Sale.PaidAmount = 0;
            scenario.Product.Tax = 10;
            scope.Context.SaveChanges();

            UpdateSaleCommand Update() => new()
            {
                Id = scenario.Sale.Id,
                PaymentType = PaymentTypeEnum.CASH,
                CustomerId = scenario.Customer.Id,
                Items = new() { new UpdateSaleItemDto { Id = scenario.Item.Id, ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 1_000 } },
            };

            await UpdateSale(scope).Handle(Update(), CancellationToken.None);
            Assert.Equal(1_100UL, (await DetailAsync(db, scenario.Sale.Id)).TotalAmount);

            // Still a draft: a new rate is picked up on the next save.
            scenario.Product.Tax = 9;
            scope.Context.SaveChanges();
            await UpdateSale(scope).Handle(Update(), CancellationToken.None);
            Assert.Equal(1_090UL, (await DetailAsync(db, scenario.Sale.Id)).TotalAmount);

            // Issued: the rate changing again does nothing to it.
            await new AddSalePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 100 }, CancellationToken.None);
            scenario.Product.Tax = 20;
            scope.Context.SaveChanges();

            var issued = await DetailAsync(db, scenario.Sale.Id);
            Assert.Equal(1_090UL, issued.TotalAmount);
            Assert.Equal(9, Assert.Single(issued.Items).TaxPercent);
        }

        [Fact]
        public async Task CreatePurchase_ComputesTheTotal_WithTheProductsTax()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            scenario.Product.Tax = 10;
            scope.Context.SaveChanges();
            var user = Seed.PersistedUser(scope.Context);

            var res = await new CreatePurchaseCommandHandler(scope.PurchaseRepository, scope.Db, FakeObjectStorage.Instance, TestMapper.Instance, scope.UnitOfWork, FakeUserContext.WithUserId(user.Id))
                .Handle(new CreatePurchaseCommand
                {
                    SupplierId = scenario.Supplier.Id,
                    PaymentType = PaymentTypeEnum.CASH,
                    Status = PurchaseStatusEnum.PROFORMA,
                    InvoiceNumber = "",
                    ProductItemList = new() { new CreatePurchaseItemDto { ProductId = scenario.Product.Id, Quantity = 4, UnitPrice = 2_500, Discount = 10 } },
                }, CancellationToken.None);

            // 4 x 2,500 = 10,000; -10% = 9,000; +10% tax = 9,900.
            var dto = Assert.IsType<PurchaseDto>(res.Data);
            Assert.Equal(9_900UL, dto.TotalAmount);
            Assert.Equal((10_000UL, 1_000UL, 9_000UL, 900UL), (dto.Items[0].GrossAmount, dto.Items[0].DiscountAmount, dto.Items[0].NetAmount, dto.Items[0].TaxAmount));
        }

        [Fact]
        public async Task CreateSale_UnknownProduct_IsANotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => CreateSale(scope, user.Id).Handle(new CreateSaleCommand
            {
                CustomerId = scenario.Customer.Id,
                PaymentType = PaymentTypeEnum.CASH,
                ProductIds = new() { new CreateSaleItemDto { ProductId = 999_999, Quantity = 1, UnitPrice = 1 } },
            }, CancellationToken.None));
        }

        // ---- installments ----

        private static async Task<SaleScenario> InstallmentProformaAsync(TestScope scope, TestDatabase db, ulong unitPrice)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0, unitPrice: unitPrice);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.InvoiceNumber = "";
            scenario.Sale.PaidAmount = 0;
            scenario.Product.Tax = 10;
            scope.Context.SaveChanges();

            // Let the server stamp the line and the invoice total, as a real proforma would be.
            await UpdateSale(scope).Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                PaymentType = PaymentTypeEnum.INSTALLMENT,
                CustomerId = scenario.Customer.Id,
                Items = new() { new UpdateSaleItemDto { Id = scenario.Item.Id, ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = unitPrice } },
            }, CancellationToken.None);
            return scenario;
        }

        [Fact]
        public async Task InstallmentPlan_KeepsItsChargeApartFromTheInvoice_AndPayableAmountShowsBoth()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await InstallmentProformaAsync(scope, db, 10_000_000); // invoice = 11,000,000 with 10% tax

            await new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork)
                .Handle(new CreateSaleInstallmentPlanCommand
                {
                    SaleId = scenario.Sale.Id,
                    MarkupPercentage = 20m,
                    DownPaymentAmount = 1_200_000,
                    InstallmentCount = 6,
                    FirstDueDate = DateTime.Now.Date.AddMonths(1),
                    PaymentType = PaymentTypeEnum.CASH,
                }, CancellationToken.None);

            var dto = await DetailAsync(db, scenario.Sale.Id);
            Assert.Equal(11_000_000UL, dto.TotalAmount);            // the invoice: lines + tax, untouched by the plan
            Assert.Equal(13_200_000UL, dto.PayableAmount);          // + 20% charge
            Assert.Equal(1_200_000UL, dto.PaidAmount);
            var summary = Assert.IsType<Application.Features.SaleInstallment.Dtos.SaleInstallmentSummaryDto>(dto.InstallmentSummary);
            Assert.Equal((11_000_000UL, 2_200_000UL, 13_200_000UL), (summary.CashAmount, summary.InstallmentChargeAmount, summary.TotalAmount));

            using var read = db.NewScope();
            var list = await new GetSaleListQueryHandler(read.Db).Handle(new GetSaleListQuery(), CancellationToken.None);
            var row = ((IEnumerable<SaleListDto>)list.Data!.GetType().GetProperty("SaleList")!.GetValue(list.Data)!).Single();
            Assert.Equal((11_000_000UL, 13_200_000UL), (row.TotalAmount, row.PayableAmount));
        }

        [Fact]
        public async Task UpdateInstallmentPlan_RecomputesTheCharge_OnTheSamePrincipal()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await InstallmentProformaAsync(scope, db, 10_000_000);
            await new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork)
                .Handle(new CreateSaleInstallmentPlanCommand
                {
                    SaleId = scenario.Sale.Id,
                    MarkupPercentage = 20m,
                    DownPaymentAmount = 1_000_000,
                    InstallmentCount = 6,
                    FirstDueDate = DateTime.Now.Date.AddMonths(1),
                    PaymentType = PaymentTypeEnum.CASH,
                }, CancellationToken.None);
            var planId = scope.Context.SaleInstallmentPlans.Single(x => x.SaleId == scenario.Sale.Id).Id;

            await new UpdateSaleInstallmentPlanCommandHandler(scope.Db, scope.UnitOfWork).Handle(new UpdateSaleInstallmentPlanCommand
            {
                Id = planId,
                MarkupPercentage = 10m,
                InstallmentCount = 4,
                FirstDueDate = DateTime.Now.Date.AddMonths(1),
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var plan = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.Id == planId);
            Assert.Equal((11_000_000UL, 1_100_000UL, 12_100_000UL), (plan.CashAmount, plan.InstallmentChargeAmount, plan.TotalAmount));
            Assert.Equal(11_100_000UL, plan.Installments.Aggregate(0UL, (sum, i) => sum + i.Amount));
            Assert.Equal(11_000_000UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).TotalAmount);
        }

        [Fact]
        public async Task ProformaWithAPlan_CannotChangeItsTotal()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await InstallmentProformaAsync(scope, db, 10_000_000);
            // A plan with no down payment leaves the sale a proforma.
            await new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork)
                .Handle(new CreateSaleInstallmentPlanCommand
                {
                    SaleId = scenario.Sale.Id,
                    MarkupPercentage = 20m,
                    DownPaymentAmount = 0,
                    InstallmentCount = 6,
                    FirstDueDate = DateTime.Now.Date.AddMonths(1),
                    PaymentType = PaymentTypeEnum.CASH,
                }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => UpdateSale(scope).Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                PaymentType = PaymentTypeEnum.INSTALLMENT,
                CustomerId = scenario.Customer.Id,
                Items = new() { new UpdateSaleItemDto { Id = scenario.Item.Id, ProductId = scenario.Product.Id, Quantity = 2, UnitPrice = 10_000_000 } },
            }, CancellationToken.None));
        }
    }
}
