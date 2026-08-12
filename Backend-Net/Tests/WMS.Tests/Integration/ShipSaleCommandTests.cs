using Application.Features.Sale.Commands;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class ShipSaleCommandTests
    {
        [Fact]
        public async Task Handle_PartialShipment_ReducesStockAndMarksPartiallyDelivered()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 10, shippedQuantity: 0, stock: 100);

            var handler = new ShipSaleCommandHandler(scope.Db, scope.UnitOfWork);
            var command = new ShipSaleCommand
            {
                SaleId = scenario.Sale.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = scenario.Item.Id, ShippedQuantity = 4 } },
            };

            await handler.Handle(command, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.SaleItems.Single(x => x.Id == scenario.Item.Id);
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);
            var sale = verify.Sales.Single(x => x.Id == scenario.Sale.Id);

            Assert.Equal(4, item.ShippedQuantity);
            Assert.Equal(96, product.Stock);
            Assert.Equal(SalesStatusEnum.PARTIALLY_DELIVERED, sale.Status);
        }

        [Fact]
        public async Task Handle_FullShipment_MarksShipped()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 10, shippedQuantity: 0, stock: 100);

            var handler = new ShipSaleCommandHandler(scope.Db, scope.UnitOfWork);
            var command = new ShipSaleCommand
            {
                SaleId = scenario.Sale.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = scenario.Item.Id, ShippedQuantity = 10 } },
            };

            await handler.Handle(command, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(SalesStatusEnum.SHIPPED, verify.Sales.Single(x => x.Id == scenario.Sale.Id).Status);
        }

        [Fact]
        public async Task Handle_ShippingMoreThanOrdered_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 0, stock: 100);

            var handler = new ShipSaleCommandHandler(scope.Db, scope.UnitOfWork);
            var command = new ShipSaleCommand
            {
                SaleId = scenario.Sale.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = scenario.Item.Id, ShippedQuantity = 6 } },
            };

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_InsufficientStock_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 10, shippedQuantity: 0, stock: 3);

            var handler = new ShipSaleCommandHandler(scope.Db, scope.UnitOfWork);
            var command = new ShipSaleCommand
            {
                SaleId = scenario.Sale.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = scenario.Item.Id, ShippedQuantity = 5 } },
            };

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_CancelledSale_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 10, shippedQuantity: 0, stock: 100);
            scenario.Sale.Status = SalesStatusEnum.CANCELLED;
            scope.Context.SaveChanges();

            var handler = new ShipSaleCommandHandler(scope.Db, scope.UnitOfWork);
            var command = new ShipSaleCommand
            {
                SaleId = scenario.Sale.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = scenario.Item.Id, ShippedQuantity = 1 } },
            };

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_UnknownSale_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new ShipSaleCommandHandler(scope.Db, scope.UnitOfWork);
            var command = new ShipSaleCommand { SaleId = 999, Items = new() { new ShipSaleItemDto { SaleItemId = 1, ShippedQuantity = 1 } } };

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_MultiRoundShipping_AccumulatesShippedQuantity()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 10, shippedQuantity: 0, stock: 100);
            var handler = new ShipSaleCommandHandler(scope.Db, scope.UnitOfWork);

            await handler.Handle(new ShipSaleCommand
            {
                SaleId = scenario.Sale.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = scenario.Item.Id, ShippedQuantity = 4 } },
            }, CancellationToken.None);

            await handler.Handle(new ShipSaleCommand
            {
                SaleId = scenario.Sale.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = scenario.Item.Id, ShippedQuantity = 6 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.SaleItems.Single(x => x.Id == scenario.Item.Id);
            var sale = verify.Sales.Single(x => x.Id == scenario.Sale.Id);

            Assert.Equal(10, item.ShippedQuantity);
            Assert.Equal(SalesStatusEnum.SHIPPED, sale.Status);
        }
    }
}
