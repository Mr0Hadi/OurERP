using Application.Common.Contracts.UserContextService;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class SaleCrudTests
    {
        [Fact]
        public async Task CreateSale_MapsScalarFieldsAndItems()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var customer = scenario.Customer;
            var user = Seed.PersistedUser(scope.Context);

            var handler = new CreateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance, FakeUserContext.WithUserId(user.Id));
            await handler.Handle(new CreateSaleCommand
            {
                InvoiceNumber = "SALE-NEW",
                InvoiceDate = DateTime.Now,
                CustomerId = customer.Id,
                TotalAmount = 5000,
                PaidAmount = 1000,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new(),
                ProductIds = new()
                {
                    new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = 2, UnitPrice = 2500, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Include(x => x.Items).Single(x => x.InvoiceNumber == "SALE-NEW");

            Assert.Equal(5000UL, sale.TotalAmount);
            Assert.Equal(1000UL, sale.PaidAmount);
            var item = Assert.Single(sale.Items);
            Assert.Equal(2, item.Quantity);
            Assert.Equal(scenario.Product.Id, item.ProductId);
        }

        [Fact]
        public async Task UpdateSale_UnknownItemId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 0, stock: 0);

            var handler = new UpdateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                InvoiceNumber = scenario.Sale.InvoiceNumber,
                InvoiceDate = DateTime.Now,
                Status = SalesStatusEnum.PROCESSING,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new(),
                CustomerId = scenario.Customer.Id,
                TotalAmount = 100,
                PaidAmount = 0,
                Items = new() { new UpdateSaleItemDto { Id = 999999, ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 100, Discount = 0 } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task UpdateSale_NewLineItem_IsAdded()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 0, stock: 0);

            var handler = new UpdateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance);
            await handler.Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                InvoiceNumber = scenario.Sale.InvoiceNumber,
                InvoiceDate = DateTime.Now,
                Status = SalesStatusEnum.PROCESSING,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new(),
                CustomerId = scenario.Customer.Id,
                TotalAmount = 100,
                PaidAmount = 0,
                Items = new()
                {
                    new UpdateSaleItemDto { Id = scenario.Item.Id, ProductId = scenario.Product.Id, Quantity = 7, UnitPrice = 200, Discount = 0 },
                    new UpdateSaleItemDto { Id = 0, ProductId = scenario.Product.Id, Quantity = 3, UnitPrice = 200, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Include(x => x.Items).Single(x => x.Id == scenario.Sale.Id);
            Assert.Equal(2, sale.Items.Count);
            Assert.Contains(sale.Items, i => i.Id == scenario.Item.Id && i.Quantity == 7);
            Assert.Contains(sale.Items, i => i.Quantity == 3);
        }

        [Fact]
        public async Task UpdateSale_RemovingLineItem_DeletesIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 0, stock: 0);

            var handler = new UpdateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance);
            await handler.Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                InvoiceNumber = scenario.Sale.InvoiceNumber,
                InvoiceDate = DateTime.Now,
                Status = SalesStatusEnum.PROCESSING,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new(),
                CustomerId = scenario.Customer.Id,
                TotalAmount = 100,
                PaidAmount = 0,
                Items = new(), // omit the existing item entirely
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Include(x => x.Items).Single(x => x.Id == scenario.Sale.Id);
            Assert.Empty(sale.Items);
        }

        [Fact]
        public async Task DeleteSale_SetsIsActiveFalse()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);

            var handler = new DeleteSaleCommandHandler(scope.Db, scope.UnitOfWork);
            await handler.Handle(new DeleteSaleCommand { Id = scenario.Sale.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.Sales.Single(x => x.Id == scenario.Sale.Id).IsActive);
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
        public async Task CreateSale_ProformaWithPartialPayment_StaysProformaWithoutInvoiceNumber()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            var handler = new CreateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance, FakeUserContext.WithUserId(user.Id));
            await handler.Handle(new CreateSaleCommand
            {
                CustomerId = scenario.Customer.Id,
                TotalAmount = 5000,
                PaidAmount = 1000,
                PaymentType = PaymentTypeEnum.CASH,
                Status = SalesStatusEnum.PROFORMA,
                PaymentDetails = new(),
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
        public async Task CreateSale_ProformaWithFullPayment_AutoFinalizesWithGeneratedInvoiceNumber()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            var handler = new CreateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance, FakeUserContext.WithUserId(user.Id));
            await handler.Handle(new CreateSaleCommand
            {
                CustomerId = scenario.Customer.Id,
                TotalAmount = 5000,
                PaidAmount = 5000,
                PaymentType = PaymentTypeEnum.CASH,
                Status = SalesStatusEnum.PROFORMA,
                PaymentDetails = new(),
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
        public async Task UpdateSale_ProformaWithoutFullPayment_ManualStatusChange_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 0, stock: 0);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.InvoiceNumber = "";
            scope.Context.SaveChanges();

            var handler = new UpdateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                InvoiceNumber = "",
                InvoiceDate = DateTime.Now,
                Status = SalesStatusEnum.PROCESSING,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new(),
                CustomerId = scenario.Customer.Id,
                TotalAmount = 5000,
                PaidAmount = 1000,
                Items = new() { new UpdateSaleItemDto { Id = scenario.Item.Id, ProductId = scenario.Product.Id, Quantity = 5, UnitPrice = 1000, Discount = 0 } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task UpdateSale_ProformaReachingFullPayment_AutoFinalizes()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 0, stock: 0);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.InvoiceNumber = "";
            scope.Context.SaveChanges();

            var handler = new UpdateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance);
            await handler.Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                InvoiceNumber = "",
                InvoiceDate = DateTime.Now,
                Status = SalesStatusEnum.PROFORMA,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new(),
                CustomerId = scenario.Customer.Id,
                TotalAmount = 5000,
                PaidAmount = 5000,
                Items = new() { new UpdateSaleItemDto { Id = scenario.Item.Id, ProductId = scenario.Product.Id, Quantity = 5, UnitPrice = 1000, Discount = 0 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.Id == scenario.Sale.Id);
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

            var handler = new CreateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance, FakeUserContext.WithUserId(user.Id));
            await handler.Handle(new CreateSaleCommand
            {
                InvoiceNumber = "",
                InvoiceDate = null,
                Status = SalesStatusEnum.PROFORMA,
                CustomerId = scenario.Customer.Id,
                TotalAmount = 5000,
                PaidAmount = 1000,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new(),
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

            var handler = new CreateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance, FakeUserContext.WithUserId(user.Id));
            await handler.Handle(new CreateSaleCommand
            {
                InvoiceNumber = "SALE-DUE",
                InvoiceDate = invoiceDate,
                PaymentDate = paymentDate,
                CustomerId = scenario.Customer.Id,
                TotalAmount = 5000,
                PaidAmount = 0,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new(),
                ProductIds = new()
                {
                    new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.InvoiceNumber == "SALE-DUE");
            Assert.Equal(paymentDate, sale.PaymentDate);

            using var readScope = db.NewScope();
            var detail = await new GetSaleDetailQueryHandler(readScope.Db, FakeObjectStorage.Instance)
                .Handle(new GetSaleDetailQuery { Id = sale.Id }, CancellationToken.None);
            Assert.Equal(paymentDate, Assert.IsType<SaleDto>(detail.Data).PaymentDate);
        }

        [Fact]
        public async Task UpdateSale_ChangesPaymentDate()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var newDue = new DateTime(2026, 12, 1);

            var handler = new UpdateSaleCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, TestMapper.Instance);
            await handler.Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                InvoiceNumber = scenario.Sale.InvoiceNumber,
                InvoiceDate = scenario.Sale.InvoiceDate,
                PaymentDate = newDue,
                Status = scenario.Sale.Status,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new(),
                TotalAmount = 5000,
                PaidAmount = 0,
                CustomerId = scenario.Customer.Id,
                Items = scenario.Sale.Items.Select(i => new UpdateSaleItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    Discount = i.Discount,
                }).ToList(),
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(newDue, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaymentDate);
        }

    }
}
