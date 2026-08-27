using Application.Features.Purchase.Commands;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.PurchaseReturn.Queries;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    // Receiving photos are now purely a receiving-time concern: ReceivePurchaseCommand no longer
    // creates or touches PurchaseReturns (see CreatePurchaseReturnCommand instead), so every image
    // hangs off the Purchase with a null PurchaseReturnId - there is no more "active return" to
    // link a round's photos to.
    public class PurchaseReceivingImageTests
    {
        private static ReceivePurchaseCommandHandler MakeReceiveHandler(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, FakeObjectStorage.Instance, scope.UnitOfWork);

        [Fact]
        public async Task ReceivePurchase_RoundWithPhotos_StoresImagesWithNoReturnLink()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            await MakeReceiveHandler(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 10 } },
                Images = new()
                {
                    new ReceivePurchaseImageDto { ObjectKey = "receiving/pallet.jpg", FileName = "pallet.jpg", Note = "بارگیری سالم" },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var image = Assert.Single(verify.PurchaseReceivingImages);
            Assert.Equal(scenario.Purchase.Id, image.PurchaseId);
            Assert.Null(image.PurchaseReturnId);
            Assert.Equal("receiving/pallet.jpg", image.ObjectKey);
            Assert.Equal("بارگیری سالم", image.Note);
        }

        [Fact]
        public async Task ReceivePurchase_SignedUrlAsObjectKey_PersistsTheBareKey()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            await MakeReceiveHandler(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 5 } },
                Images = new()
                {
                    new ReceivePurchaseImageDto { ObjectKey = $"{FakeObjectStorage.Host}/receiving/box.jpg?signature=test" },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal("receiving/box.jpg", verify.PurchaseReceivingImages.Single().ObjectKey);
        }

        [Fact]
        public async Task GetPurchaseReceivingInfo_ReturnsAllImagesForThePurchaseWithSignedUrls()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);
            var handler = MakeReceiveHandler(scope);

            await handler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 4 } },
                Images = new() { new ReceivePurchaseImageDto { ObjectKey = "receiving/round-1.jpg" } },
            }, CancellationToken.None);

            await handler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 6 } },
                Images = new() { new ReceivePurchaseImageDto { ObjectKey = "receiving/round-2.jpg" } },
            }, CancellationToken.None);

            using var readScope = db.NewScope();
            var infoHandler = new GetPurchaseReceivingInfoQueryHandler(readScope.Db, FakeObjectStorage.Instance);
            var info = (PurchaseReceivingInfoDto)(await infoHandler.Handle(new GetPurchaseReceivingInfoQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None)).Data!;

            Assert.Equal(2, info.ReceivingImages.Count);
            Assert.All(info.ReceivingImages, img => Assert.Contains(img.ObjectKey, img.Url));
        }
    }
}
