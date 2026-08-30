using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class ReceivePurchaseCommandTests
    {
        private static ReceivePurchaseCommandHandler MakeHandler(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

        [Fact]
        public async Task Handle_ReceivingGoodQuantity_IncreasesStockAndReceivedQuantity()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 5);

            var handler = MakeHandler(scope);
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 6 } },
            };

            await handler.Handle(command, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id);
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);
            var purchase = verify.Purchases.Single(x => x.Id == scenario.Purchase.Id);

            Assert.Equal(6, item.ReceivedQuantity);
            Assert.Equal(11, product.Stock);
            Assert.Equal(PurchaseStatusEnum.PARTIALLY_RECEIVED, purchase.Status);
        }

        [Fact]
        public async Task Handle_OverBudgetReceiving_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            var handler = MakeHandler(scope);
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 6 } },
            };

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_CancelledPurchase_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            scenario.Purchase.Status = PurchaseStatusEnum.CANCELLED;
            scope.Context.SaveChanges();

            var handler = MakeHandler(scope);
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 1 } },
            };

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_SecondRound_AccumulatesReceivedQuantity()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 20, stock: 0);
            var handler = MakeHandler(scope);

            await handler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 5 } },
            }, CancellationToken.None);

            await handler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 3 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id);

            Assert.Equal(8, item.ReceivedQuantity);
        }

        [Fact]
        public async Task Handle_FullyReceived_MarksPurchaseReceived()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);
            var handler = MakeHandler(scope);

            await handler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 10 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(PurchaseStatusEnum.RECEIVED, verify.Purchases.Single().Status);
        }
    }
}
