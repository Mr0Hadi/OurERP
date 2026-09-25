using Application.Common.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class SaleCrudTests
    {
        private static CreateSaleCommandHandler CreateHandler(TestScope scope, int userId) =>
            new(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance, FakeUserContext.WithUserId(userId));

        private static UpdateSaleCommandHandler UpdateHandler(TestScope scope) =>
            new(scope.Db, FakeObjectStorage.Instance, scope.SaleInstallmentPlanRepository, scope.UnitOfWork, TestMapper.Instance);

        private static AddSalePaymentCommandHandler AddPayment(TestScope scope) => new(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

        private static ChangeSaleStatusCommandHandler StatusHandler(TestScope scope) => new(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

        /// <summary>A sale nothing has been shipped or paid on, turned back into a draft for tests that edit it.</summary>
        private static SaleScenario ProformaSale(TestScope scope, int orderedQuantity = 5)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: orderedQuantity, shippedQuantity: 0, stock: 0);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.InvoiceNumber = "";
            scenario.Sale.PaidAmount = 0;
            scope.Context.SaveChanges();
            return scenario;
        }

        private static UpdateSaleCommand UpdateOf(SaleScenario scenario, Action<UpdateSaleCommand>? change = null)
        {
            var command = new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                PaymentType = PaymentTypeEnum.CASH,
                CustomerId = scenario.Customer.Id,
                Items = new() { new UpdateSaleItemDto { Id = scenario.Item.Id, ProductId = scenario.Product.Id, Quantity = scenario.Item.Quantity, UnitPrice = scenario.Item.UnitPrice } },
            };
            change?.Invoke(command);
            return command;
        }

        [Fact]
        public async Task CreateSale_MapsScalarFieldsAndItems()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            var created = await CreateHandler(scope, user.Id).Handle(new CreateSaleCommand
            {
                InvoiceDate = DateTime.Now,
                CustomerId = scenario.Customer.Id,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new() { new PaymentDetailDto { Type = PaymentTypeEnum.CASH, Amount = 1000 } },
                ProductIds = new()
                {
                    new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = 2, UnitPrice = 2500, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var createdId = Assert.IsType<CreatedSaleDto>(created.Data).Id;
            var sale = verify.Sales.Include(x => x.Items).Include(x => x.PaymentDetails).Single(x => x.Id == createdId);

            Assert.Equal(5000UL, sale.TotalAmount);
            Assert.Equal(1000UL, sale.PaidAmount);
            Assert.Equal(PaymentDirectionEnum.IN, Assert.Single(sale.PaymentDetails).Direction);
            var item = Assert.Single(sale.Items);
            Assert.Equal(2, item.Quantity);
            Assert.Equal(scenario.Product.Id, item.ProductId);
        }

        [Fact]
        public async Task CreateSale_PersistsPaymentDetails()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            var created = await CreateHandler(scope, user.Id).Handle(new CreateSaleCommand
            {
                CustomerId = scenario.Customer.Id,
                PaymentType = PaymentTypeEnum.CHECK,
                PaymentDetails = new()
                {
                    new PaymentDetailDto { Type = PaymentTypeEnum.CHECK, Amount = 5000, PaidAt = new DateTime(2026, 8, 10), CheckNumber = "CHK-1" },
                },
                ProductIds = new() { new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 } },
            }, CancellationToken.None);

            var createdId = Assert.IsType<CreatedSaleDto>(created.Data).Id;

            using var verify = db.NewContext();
            var payment = Assert.Single(verify.PaymentDetails.Where(x => x.SaleId == createdId));
            Assert.Equal(PaymentTypeEnum.CHECK, payment.Type);
            Assert.Equal(PaymentPurposeEnum.NORMAL, payment.Purpose);
            Assert.Equal(5000m, payment.Amount);
            Assert.Equal("CHK-1", payment.CheckNumber);
        }

        [Fact]
        public void CreateSaleValidator_PaymentRowsOnAnInstallmentSale_AreInvalid()
        {
            var result = new CreateSaleCommandValidator().Validate(new CreateSaleCommand
            {
                CustomerId = 1,
                PaymentType = PaymentTypeEnum.INSTALLMENT,
                PaymentDetails = new() { new PaymentDetailDto { Type = PaymentTypeEnum.CASH, Amount = 1000 } },
                ProductIds = new() { new CreateSaleItemDto { ProductId = 1, Quantity = 1, UnitPrice = 5000 } },
            });

            Assert.False(result.IsValid);
        }

        [Fact]
        public async Task UpdateSale_OnAnIssuedSale_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 0, stock: 0);

            await Assert.ThrowsAsync<ValidationCustomException>(() => UpdateHandler(scope).Handle(UpdateOf(scenario), CancellationToken.None));
        }

        [Fact]
        public async Task UpdateSale_UnknownItemId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaSale(scope);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => UpdateHandler(scope).Handle(UpdateOf(scenario, c =>
                c.Items = new() { new UpdateSaleItemDto { Id = 999999, ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 100, Discount = 0 } }),
                CancellationToken.None));
        }

        [Fact]
        public async Task UpdateSale_OnAProforma_NewLineItem_IsAdded()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaSale(scope);

            var res = await UpdateHandler(scope).Handle(UpdateOf(scenario, c => c.Items = new()
            {
                new UpdateSaleItemDto { Id = scenario.Item.Id, ProductId = scenario.Product.Id, Quantity = 7, UnitPrice = 200, Discount = 0 },
                new UpdateSaleItemDto { Id = 0, ProductId = scenario.Product.Id, Quantity = 3, UnitPrice = 200, Discount = 0 },
            }), CancellationToken.None);

            Assert.Equal(2, Assert.IsType<SaleDto>(res.Data).Items.Count);

            using var verify = db.NewContext();
            var sale = verify.Sales.Include(x => x.Items).Single(x => x.Id == scenario.Sale.Id);
            Assert.Equal(2, sale.Items.Count);
            Assert.Contains(sale.Items, i => i.Id == scenario.Item.Id && i.Quantity == 7);
            Assert.Contains(sale.Items, i => i.Quantity == 3);
            Assert.Equal(SalesStatusEnum.PROFORMA, sale.Status);
        }

        [Fact]
        public async Task UpdateSale_OnAProforma_RemovingLineItem_DeletesIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaSale(scope);

            await UpdateHandler(scope).Handle(UpdateOf(scenario, c => c.Items = new()), CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Empty(verify.Sales.Include(x => x.Items).Single(x => x.Id == scenario.Sale.Id).Items);
        }

        [Fact]
        public async Task DeleteSale_Proforma_IsHiddenFromDetailAndList()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaSale(scope, orderedQuantity: 1);

            await new DeleteSaleCommandHandler(scope.Db, scope.UnitOfWork).Handle(new DeleteSaleCommand { Id = scenario.Sale.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.Sales.Single(x => x.Id == scenario.Sale.Id).IsActive);

            using var read = db.NewScope();
            await Assert.ThrowsAsync<NotFoundCustomException>(() => new GetSaleDetailQueryHandler(read.Db, FakeObjectStorage.Instance)
                .Handle(new GetSaleDetailQuery { Id = scenario.Sale.Id }, CancellationToken.None));
            var list = await new GetSaleListQueryHandler(read.Db).Handle(new GetSaleListQuery(), CancellationToken.None);
            Assert.Empty(((System.Collections.IEnumerable)list.Data!.GetType().GetProperty("SaleList")!.GetValue(list.Data)!).Cast<object>());
        }

        [Fact]
        public async Task DeleteSale_Issued_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);

            await Assert.ThrowsAsync<ValidationCustomException>(() => new DeleteSaleCommandHandler(scope.Db, scope.UnitOfWork)
                .Handle(new DeleteSaleCommand { Id = scenario.Sale.Id }, CancellationToken.None));
        }

        [Fact]
        public async Task GetSaleDetail_ReturnsMappedDto()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 3, shippedQuantity: 0, stock: 0);

            var handler = new GetSaleDetailQueryHandler(scope.Db, FakeObjectStorage.Instance);
            var res = await handler.Handle(new GetSaleDetailQuery { Id = scenario.Sale.Id }, CancellationToken.None);

            var dto = Assert.IsType<SaleDto>(res.Data);
            Assert.Equal(scenario.Sale.InvoiceNumber, dto.InvoiceNumber);
            Assert.Single(dto.Items);
        }

        [Fact]
        public async Task GetSaleList_FiltersByCustomerName()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);

            var handler = new GetSaleListQueryHandler(scope.Db);
            var res = await handler.Handle(new GetSaleListQuery { CustomerName = scenario.Customer.FirstName }, CancellationToken.None);
            var missing = await handler.Handle(new GetSaleListQuery { CustomerName = "کسی-که-وجود-ندارد" }, CancellationToken.None);

            var matchingList = (System.Collections.IEnumerable)res.Data!.GetType().GetProperty("SaleList")!.GetValue(res.Data)!;
            var missingList = (System.Collections.IEnumerable)missing.Data!.GetType().GetProperty("SaleList")!.GetValue(missing.Data)!;

            Assert.Single(matchingList.Cast<object>());
            Assert.Empty(missingList.Cast<object>());
        }

        [Fact]
        public async Task CreateSale_WithNoPayment_StaysProformaWithoutInvoiceNumber()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            await CreateHandler(scope, user.Id).Handle(new CreateSaleCommand
            {
                CustomerId = scenario.Customer.Id,
                PaymentType = PaymentTypeEnum.CASH,
                ProductIds = new()
                {
                    new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.CustomerId == scenario.Customer.Id && x.TotalAmount == 5000);
            Assert.Equal(SalesStatusEnum.PROFORMA, sale.Status);
            Assert.True(string.IsNullOrEmpty(sale.InvoiceNumber));
        }

        [Fact]
        public async Task CreateSale_WithAnyPayment_AutoFinalizesWithGeneratedInvoiceNumber()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            await CreateHandler(scope, user.Id).Handle(new CreateSaleCommand
            {
                CustomerId = scenario.Customer.Id,
                PaymentType = PaymentTypeEnum.CASH,
                // یک ریال کافی است: پیش‌فاکتور یعنی هنوز هیچ پولی جابه‌جا نشده.
                PaymentDetails = new() { new PaymentDetailDto { Type = PaymentTypeEnum.CASH, Amount = 1 } },
                ProductIds = new()
                {
                    new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.CustomerId == scenario.Customer.Id && x.TotalAmount == 5000);
            Assert.Equal(SalesStatusEnum.PROCESSING, sale.Status);
            Assert.False(string.IsNullOrEmpty(sale.InvoiceNumber));
        }

        [Fact]
        public async Task CreateSale_AsProforma_WithoutInvoiceDate_PersistsNull()
        {
            // تاریخ فاکتور در پیش‌فاکتور واقعاً null ذخیره می‌شود، نه 0001-01-01.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            await CreateHandler(scope, user.Id).Handle(new CreateSaleCommand
            {
                InvoiceDate = null,
                CustomerId = scenario.Customer.Id,
                PaymentType = PaymentTypeEnum.CASH,
                Description = "PROFORMA-NULL-DATE",
                ProductIds = new()
                {
                    new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.Description == "PROFORMA-NULL-DATE");
            Assert.Equal(SalesStatusEnum.PROFORMA, sale.Status);
            Assert.Null(sale.InvoiceDate);
        }

        [Fact]
        public async Task CreateSale_PersistsPaymentDate_AndDetailQueryReturnsIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var user = Seed.PersistedUser(scope.Context);
            var invoiceDate = new DateTime(2026, 8, 10);
            var paymentDate = new DateTime(2026, 9, 9);

            var created = await CreateHandler(scope, user.Id).Handle(new CreateSaleCommand
            {
                InvoiceDate = invoiceDate,
                PaymentDate = paymentDate,
                CustomerId = scenario.Customer.Id,
                PaymentType = PaymentTypeEnum.CASH,
                ProductIds = new()
                {
                    new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var createdId = Assert.IsType<CreatedSaleDto>(created.Data).Id;
            var sale = verify.Sales.Single(x => x.Id == createdId);
            Assert.Equal(paymentDate, sale.PaymentDate);

            using var readScope = db.NewScope();
            var detail = await new GetSaleDetailQueryHandler(readScope.Db, FakeObjectStorage.Instance)
                .Handle(new GetSaleDetailQuery { Id = sale.Id }, CancellationToken.None);
            Assert.Equal(paymentDate, Assert.IsType<SaleDto>(detail.Data).PaymentDate);
        }

        [Fact]
        public async Task UpdateSalePaymentDate_OnAnIssuedSale_ChangesOnlyTheDueDate()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var newDue = DateTime.Now.Date.AddMonths(2);

            await new UpdateSalePaymentDateCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new UpdateSalePaymentDateCommand { Id = scenario.Sale.Id, PaymentDate = newDue }, CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.Id == scenario.Sale.Id);
            Assert.Equal(newDue, sale.PaymentDate);
            Assert.Equal(scenario.Sale.Status, sale.Status);
        }

        [Fact]
        public async Task UpdateSaleAttachments_OnAnIssuedSale_ReplacesThem()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var handler = new UpdateSaleAttachmentsCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

            await handler.Handle(new UpdateSaleAttachmentsCommand { Id = scenario.Sale.Id, Attachments = new() { new() { ObjectKey = "a.pdf" }, new() { ObjectKey = "b.pdf" } } }, CancellationToken.None);
            var res = await handler.Handle(new UpdateSaleAttachmentsCommand { Id = scenario.Sale.Id, Attachments = new() { new() { ObjectKey = "c.pdf" } } }, CancellationToken.None);

            Assert.Equal("c.pdf", Assert.Single(Assert.IsType<SaleDto>(res.Data).Attachments).ObjectKey);
        }

        // ---- payments ----

        [Fact]
        public async Task AddSalePayment_FirstPaymentOnAProforma_IssuesTheInvoice_AndLocksIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaSale(scope);

            var res = await AddPayment(scope).Handle(new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1 }, CancellationToken.None);

            var dto = Assert.IsType<SaleDto>(res.Data);
            Assert.Equal(SalesStatusEnum.PROCESSING, dto.Status);
            Assert.False(string.IsNullOrEmpty(dto.InvoiceNumber));
            Assert.NotNull(dto.InvoiceDate);
            Assert.Equal(1UL, dto.PaidAmount);

            await Assert.ThrowsAsync<ValidationCustomException>(() => UpdateHandler(scope).Handle(UpdateOf(scenario), CancellationToken.None));
        }

        [Fact]
        public async Task SalePayments_VoidingBackToZero_KeepsTheInvoiceIssued()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaSale(scope);
            var paid = Assert.IsType<SaleDto>((await AddPayment(scope).Handle(
                new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1000 }, CancellationToken.None)).Data);

            var voided = Assert.IsType<SaleDto>((await new VoidSalePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new VoidSalePaymentCommand { PaymentId = paid.PaymentDetails.Single().Id }, CancellationToken.None)).Data);

            Assert.Equal(0UL, voided.PaidAmount);
            Assert.Equal(SalesStatusEnum.PROCESSING, voided.Status);
            Assert.Equal(paid.InvoiceNumber, voided.InvoiceNumber);
            Assert.NotNull(Assert.Single(voided.PaymentDetails).VoidedAt);
        }

        [Fact]
        public async Task SalePayments_EditAndRefund_KeepPaidAmountEqualToTheRows()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            scenario.Sale.PaidAmount = 0;
            scope.Context.SaveChanges();

            var first = Assert.IsType<SaleDto>((await AddPayment(scope).Handle(
                new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 3000 }, CancellationToken.None)).Data).PaymentDetails.Single();

            var afterEdit = Assert.IsType<SaleDto>((await new EditSalePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new EditSalePaymentCommand { PaymentId = first.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 2500, TransferRef = "TR-1" }, CancellationToken.None)).Data);
            Assert.Equal(2500UL, afterEdit.PaidAmount);
            Assert.Equal(2, afterEdit.PaymentDetails.Count);

            var afterRefund = Assert.IsType<SaleDto>((await AddPayment(scope).Handle(
                new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 500, Direction = PaymentDirectionEnum.OUT }, CancellationToken.None)).Data);
            Assert.Equal(2000UL, afterRefund.PaidAmount);
            Assert.Equal(PaymentDirectionEnum.OUT, afterRefund.PaymentDetails.Single(p => p.Amount == 500).Direction);

            await Assert.ThrowsAsync<ValidationCustomException>(() => AddPayment(scope).Handle(
                new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 9000, Direction = PaymentDirectionEnum.OUT }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Equal(2000UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
        }

        [Fact]
        public async Task AddSalePayment_OnAnInstallmentSale_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaSale(scope, orderedQuantity: 1);
            scenario.Sale.PaymentType = PaymentTypeEnum.INSTALLMENT;
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ValidationCustomException>(() => AddPayment(scope).Handle(
                new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1000 }, CancellationToken.None));
        }

        [Fact]
        public async Task VoidSalePayment_InstallmentRow_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var row = new Domain.Entities.PaymentDetail
            {
                SaleId = scenario.Sale.Id,
                Type = PaymentTypeEnum.CASH,
                Purpose = PaymentPurposeEnum.INSTALLMENT_DOWN_PAYMENT,
                Direction = PaymentDirectionEnum.IN,
                Amount = 2_000,
                PaidAt = new DateTime(2026, 8, 1),
            };
            scope.Context.PaymentDetails.Add(row);
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ValidationCustomException>(() => new VoidSalePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new VoidSalePaymentCommand { PaymentId = row.Id }, CancellationToken.None));
        }

        // ---- status and the proforma guard on shipping ----

        [Fact]
        public async Task ShipSale_OnAProforma_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaSale(scope, orderedQuantity: 2);
            scenario.Product.Stock = 2;
            Seed.MintUnits(scope.Context, scenario.Product, 2);
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ValidationCustomException>(() => new ShipSaleCommandHandler(scope.Db, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork)
                .Handle(new ShipSaleCommand
                {
                    SaleId = scenario.Sale.Id,
                    Items = new() { new ShipSaleItemDto { SaleItemId = scenario.Item.Id, ShippedQuantity = 2 } },
                }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Equal(2, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task ChangeSaleStatus_CancelBeforeShipping_KeepsThePayments()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaSale(scope, orderedQuantity: 1);
            await AddPayment(scope).Handle(new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1000 }, CancellationToken.None);

            var cancelled = Assert.IsType<SaleDto>((await StatusHandler(scope).Handle(
                new ChangeSaleStatusCommand { Id = scenario.Sale.Id, Status = SalesStatusEnum.CANCELLED }, CancellationToken.None)).Data);
            Assert.Equal(SalesStatusEnum.CANCELLED, cancelled.Status);
            Assert.Equal(1000UL, cancelled.PaidAmount);

            // No new money on a cancelled sale; the refund back to the customer is accepted.
            await Assert.ThrowsAsync<ValidationCustomException>(() => AddPayment(scope).Handle(
                new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1 }, CancellationToken.None));
            var refunded = Assert.IsType<SaleDto>((await AddPayment(scope).Handle(
                new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1000, Direction = PaymentDirectionEnum.OUT }, CancellationToken.None)).Data);
            Assert.Equal(0UL, refunded.PaidAmount);
        }

        [Fact]
        public async Task ChangeSaleStatus_CancelAfterShipping_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 2, shippedQuantity: 1);

            await Assert.ThrowsAsync<ValidationCustomException>(() => StatusHandler(scope).Handle(
                new ChangeSaleStatusCommand { Id = scenario.Sale.Id, Status = SalesStatusEnum.CANCELLED }, CancellationToken.None));
        }

        [Fact]
        public async Task ChangeSaleStatus_Delivered_OnlyOnceFullyShipped()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var partial = Seed.ShippedSale(scope.Context, orderedQuantity: 2, shippedQuantity: 1);
            var full = Seed.ShippedSale(scope.Context, orderedQuantity: 2, shippedQuantity: 2);

            await Assert.ThrowsAsync<ValidationCustomException>(() => StatusHandler(scope).Handle(
                new ChangeSaleStatusCommand { Id = partial.Sale.Id, Status = SalesStatusEnum.DELIVERED }, CancellationToken.None));

            var res = await StatusHandler(scope).Handle(new ChangeSaleStatusCommand { Id = full.Sale.Id, Status = SalesStatusEnum.DELIVERED }, CancellationToken.None);
            Assert.Equal(SalesStatusEnum.DELIVERED, Assert.IsType<SaleDto>(res.Data).Status);
        }

        [Theory]
        [InlineData(SalesStatusEnum.PROFORMA)]
        [InlineData(SalesStatusEnum.PROCESSING)]
        [InlineData(SalesStatusEnum.SHIPPED)]
        [InlineData(SalesStatusEnum.RETURNED)]
        public void ChangeSaleStatusValidator_SystemSetStatus_IsInvalid(SalesStatusEnum status)
        {
            Assert.False(new ChangeSaleStatusCommandValidator().Validate(new ChangeSaleStatusCommand { Id = 1, Status = status }).IsValid);
        }
    }
}
