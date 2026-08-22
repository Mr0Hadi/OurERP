using Application.Features.Purchase.Commands;
using Application.Features.PurchaseReturn.Commands;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.PurchaseReturn.Queries;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class PurchaseReceivingImageTests
    {
        private static ReceivePurchaseCommandHandler MakeReceiveHandler(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, scope.ProductUnitService, FakeObjectStorage.Instance, scope.UnitOfWork);

        [Fact]
        public async Task ReceivePurchase_CleanRoundWithPhotos_StoresImagesWithNoReturnLink()
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
            // A clean round creates no PurchaseReturn at all, which is exactly why the image hangs
            // off the Purchase rather than the return.
            Assert.Empty(verify.PurchaseReturns);

            var image = Assert.Single(verify.PurchaseReceivingImages);
            Assert.Equal(scenario.Purchase.Id, image.PurchaseId);
            Assert.Null(image.PurchaseReturnId);
            Assert.Equal("receiving/pallet.jpg", image.ObjectKey);
            Assert.Equal("بارگیری سالم", image.Note);
        }

        [Fact]
        public async Task ReceivePurchase_RoundWithIssues_LinksImagesToTheActiveReturn()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            await MakeReceiveHandler(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ReceivedQuantity = 7,
                        Issues = new() { new ReceivePurchaseIssueDto { Type = PurchaseIssueTypeEnum.DAMAGED, Quantity = 3 } },
                    },
                },
                Images = new()
                {
                    new ReceivePurchaseImageDto { ObjectKey = "receiving/damage-1.jpg" },
                    new ReceivePurchaseImageDto { ObjectKey = "receiving/damage-2.jpg" },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var purchaseReturn = Assert.Single(verify.PurchaseReturns);
            var images = await verify.PurchaseReceivingImages.OrderBy(x => x.ObjectKey).ToListAsync();

            Assert.Equal(2, images.Count);
            Assert.All(images, img => Assert.Equal(purchaseReturn.Id, img.PurchaseReturnId));
            Assert.All(images, img => Assert.Equal(scenario.Purchase.Id, img.PurchaseId));
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
        public async Task DeletePurchaseReturn_KeepsReceivingImagesAndNullsTheLink()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            await MakeReceiveHandler(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ReceivedQuantity = 8,
                        Issues = new() { new ReceivePurchaseIssueDto { Type = PurchaseIssueTypeEnum.SHORTAGE, Quantity = 2 } },
                    },
                },
                Images = new() { new ReceivePurchaseImageDto { ObjectKey = "receiving/evidence.jpg" } },
            }, CancellationToken.None);

            var returnId = scope.Context.PurchaseReturns.Single().Id;

            using (var deleteScope = db.NewScope())
            {
                var deleteHandler = new DeletePurchaseReturnCommandHandler(deleteScope.Db, deleteScope.PurchaseReturnRepository, deleteScope.PurchaseReturnCalculation, deleteScope.UnitOfWork);
                await deleteHandler.Handle(new DeletePurchaseReturnCommand { Id = returnId }, CancellationToken.None);
            }

            using var verify = db.NewContext();
            Assert.Empty(verify.PurchaseReturns);

            // The receiving event still happened, so the photo survives with a null return link.
            var image = Assert.Single(verify.PurchaseReceivingImages);
            Assert.Null(image.PurchaseReturnId);
            Assert.Equal("receiving/evidence.jpg", image.ObjectKey);
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
            var infoHandler = new GetPurchaseReceivingInfoQueryHandler(readScope.Db, readScope.PurchaseReturnRepository, readScope.PurchaseReturnCalculation, FakeObjectStorage.Instance);
            var info = (PurchaseReceivingInfoDto)(await infoHandler.Handle(new GetPurchaseReceivingInfoQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None)).Data!;

            // Both rounds' photos, across the whole purchase - not just the active return's.
            Assert.Equal(2, info.ReceivingImages.Count);
            Assert.All(info.ReceivingImages, img => Assert.Contains(img.ObjectKey, img.Url));
        }

        [Fact]
        public async Task GetPurchaseReturnDetail_ExposesTheRoundsImages()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            await MakeReceiveHandler(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ReceivedQuantity = 6,
                        Issues = new() { new ReceivePurchaseIssueDto { Type = PurchaseIssueTypeEnum.DEFECTIVE, Quantity = 4 } },
                    },
                },
                Images = new() { new ReceivePurchaseImageDto { ObjectKey = "receiving/defect.jpg", Note = "خط روی بدنه" } },
            }, CancellationToken.None);

            var returnId = scope.Context.PurchaseReturns.Single().Id;

            using var readScope = db.NewScope();
            var detailHandler = new GetPurchaseReturnDetailQueryHandler(readScope.Db, FakeObjectStorage.Instance);
            var detail = (PurchaseReturnDetailDto)(await detailHandler.Handle(new GetPurchaseReturnDetailQuery { Id = returnId }, CancellationToken.None)).Data!;

            var image = Assert.Single(detail.ReceivingImages);
            Assert.Equal("receiving/defect.jpg", image.ObjectKey);
            Assert.Equal("خط روی بدنه", image.Note);
            Assert.Equal(returnId, image.PurchaseReturnId);
            Assert.Contains("receiving/defect.jpg", image.Url);
        }
    }
}
