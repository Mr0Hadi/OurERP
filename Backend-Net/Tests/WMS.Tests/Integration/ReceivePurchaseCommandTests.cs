using Application.Features.PurchaseReturn.Commands;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class ReceivePurchaseCommandTests
    {
        private static ReceivePurchaseCommandHandler MakeHandler(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.UnitOfWork);

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
        public async Task Handle_ReceivingWithShortageIssue_CreatesPurchaseReturnAndDoesNotAddIssueQtyToStock()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            var handler = MakeHandler(scope);
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ReceivedQuantity = 7,
                        Issues = new() { new ReceivePurchaseIssueDto { Type = PurchaseIssueTypeEnum.SHORTAGE, Quantity = 3 } },
                    },
                },
            };

            await handler.Handle(command, CancellationToken.None);

            using var verify = db.NewContext();
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);
            var purchaseReturn = verify.PurchaseReturns.Include(x => x.Items).Single(x => x.PurchaseId == scenario.Purchase.Id);

            Assert.Equal(7, product.Stock); // only the good 7, not the 3 short units
            Assert.Equal(PurchaseReturnStatusEnum.PENDING, purchaseReturn.Status);
            Assert.Single(purchaseReturn.Items);
            Assert.Equal(3, purchaseReturn.Items[0].Quantity);
            Assert.Equal(PurchaseIssueTypeEnum.SHORTAGE, purchaseReturn.Items[0].IssueType);
        }

        [Fact]
        public async Task Handle_ExcessQuantity_ExemptFromBudgetButNotAddedToStock()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            var handler = MakeHandler(scope);
            // 5 good (fills the whole order) + 3 excess: excess must not fail budget validation.
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ReceivedQuantity = 5,
                        Issues = new() { new ReceivePurchaseIssueDto { Type = PurchaseIssueTypeEnum.EXCESS, Quantity = 3 } },
                    },
                },
            };

            await handler.Handle(command, CancellationToken.None);

            using var verify = db.NewContext();
            var product = verify.Products.Single(x => x.Id == scenario.Product.Id);

            Assert.Equal(5, product.Stock); // excess quantity never touches stock
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
        public async Task Handle_SecondRoundReusesSameActiveReturn_MergesIssuesByType()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 20, stock: 0);
            var handler = MakeHandler(scope);

            await handler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ReceivedQuantity = 5,
                        Issues = new() { new ReceivePurchaseIssueDto { Type = PurchaseIssueTypeEnum.DAMAGED, Quantity = 2 } },
                    },
                },
            }, CancellationToken.None);

            var firstReturnId = scope.Context.PurchaseReturns.Single().Id;

            await handler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ReceivedQuantity = 5,
                        Issues = new() { new ReceivePurchaseIssueDto { Type = PurchaseIssueTypeEnum.DAMAGED, Quantity = 3 } },
                    },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var returns = verify.PurchaseReturns.Include(x => x.Items).ToList();

            Assert.Single(returns); // reused, not a second PurchaseReturn
            Assert.Equal(firstReturnId, returns[0].Id);
            Assert.Single(returns[0].Items); // merged into one line, not two
            Assert.Equal(5, returns[0].Items[0].Quantity); // 2 + 3
        }

        [Fact]
        public async Task Handle_FullyReceivedWithNoOpenIssues_MarksPurchaseReceived()
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
