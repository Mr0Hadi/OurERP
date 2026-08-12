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
        [Fact]
        public async Task CreateSale_MapsScalarFieldsAndItems()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var customer = scenario.Customer;

            var handler = new CreateSaleCommandHandler(scope.Db, scope.UnitOfWork, TestMapper.Instance);
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

            var handler = new UpdateSaleCommandHandler(scope.Db, scope.UnitOfWork, TestMapper.Instance);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                InvoiceNumber = scenario.Sale.InvoiceNumber,
                InvoiceDate = DateTime.Now,
                Status = SalesStatusEnum.PENDING,
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

            var handler = new UpdateSaleCommandHandler(scope.Db, scope.UnitOfWork, TestMapper.Instance);
            await handler.Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                InvoiceNumber = scenario.Sale.InvoiceNumber,
                InvoiceDate = DateTime.Now,
                Status = SalesStatusEnum.PENDING,
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

            var handler = new UpdateSaleCommandHandler(scope.Db, scope.UnitOfWork, TestMapper.Instance);
            await handler.Handle(new UpdateSaleCommand
            {
                Id = scenario.Sale.Id,
                InvoiceNumber = scenario.Sale.InvoiceNumber,
                InvoiceDate = DateTime.Now,
                Status = SalesStatusEnum.PENDING,
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

            var handler = new GetSaleDetailQueryHandler(scope.Db);
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
    }
}
