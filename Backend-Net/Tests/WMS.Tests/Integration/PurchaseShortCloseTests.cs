using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Closing a purchase line short: the supplier will not deliver the rest. The line's missing units stop being owed, the
    /// purchase can reach RECEIVED, anything that still arrives on the line is excess, and nothing moves in stock or the ledger.
    /// </summary>
    public class PurchaseShortCloseTests
    {
        private static ReceivePurchaseCommandHandler Receive(TestScope s) =>
            new(s.Db, s.PurchaseReturnCalculation, s.ProductUnitService, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);

        private static Task ReceiveAsync(TestScope scope, PurchaseScenario s, int arrived) =>
            Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = s.Item.Id, ArrivedQuantity = arrived } },
            }, CancellationToken.None);

        [Fact]
        public async Task Close_WritesOffTheMissingUnits_AndTheRestArrivingLaterIsExcess()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 100);
            await ReceiveAsync(scope, s, 60);

            await new ClosePurchaseItemCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork)
                .Handle(new ClosePurchaseItemCommand { PurchaseItemId = s.Item.Id }, CancellationToken.None);

            using (var verify = db.NewContext())
            {
                var item = verify.PurchaseItems.Single(x => x.Id == s.Item.Id);
                Assert.Equal(40, item.ShortClosedQuantity);
                Assert.NotNull(item.ShortClosedAt);
                Assert.Equal(0, item.StillOwedQuantity);
                Assert.Equal(PurchaseStatusEnum.RECEIVED, verify.Purchases.Single().Status);
                Assert.Equal(60, verify.Products.Single(p => p.Id == s.Product.Id).Stock); // nothing moved
            }

            // The supplier sends 5 after all: they are no longer owed, so they are excess, held in quarantine at 0.
            await ReceiveAsync(scope, s, 5);

            using var after = db.NewContext();
            Assert.Equal(60, after.PurchaseItems.Single(x => x.Id == s.Item.Id).ReceivedQuantity);
            Assert.Equal(60, after.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(5, after.ProductUnits.Count(u => u.Status == ProductUnitStatusEnum.QUARANTINED && u.CustodyReason == UnitCustodyReasonEnum.EXCESS));
        }

        [Fact]
        public async Task Reopen_MakesTheUnitsOwedAgain()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 10);
            await ReceiveAsync(scope, s, 4);

            await new ClosePurchaseItemCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork)
                .Handle(new ClosePurchaseItemCommand { PurchaseItemId = s.Item.Id }, CancellationToken.None);
            await new ReopenPurchaseItemCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork)
                .Handle(new ReopenPurchaseItemCommand { PurchaseItemId = s.Item.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.PurchaseItems.Single(x => x.Id == s.Item.Id);
            Assert.Equal(0, item.ShortClosedQuantity);
            Assert.Null(item.ShortClosedAt);
            Assert.Equal(6, item.StillOwedQuantity);
            Assert.Equal(PurchaseStatusEnum.PARTIALLY_RECEIVED, verify.Purchases.Single().Status);
        }

        [Fact]
        public async Task Close_WhenNothingIsOwed_OrTwice_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var full = Seed.PendingPurchase(scope.Context, orderedQuantity: 3);
            await ReceiveAsync(scope, full, 3);
            var handler = new ClosePurchaseItemCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new ClosePurchaseItemCommand { PurchaseItemId = full.Item.Id }, CancellationToken.None));

            var partial = Seed.PendingPurchase(scope.Context, orderedQuantity: 3);
            await handler.Handle(new ClosePurchaseItemCommand { PurchaseItemId = partial.Item.Id }, CancellationToken.None);
            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new ClosePurchaseItemCommand { PurchaseItemId = partial.Item.Id }, CancellationToken.None));
        }
    }
}
