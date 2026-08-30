using Application.Features.Barcode.Queries;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.PurchaseReturn.Commands;
using Common.Exceptions;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class PurchaseReceivingLabelsPdfTests
    {
        [Fact]
        public async Task Handle_Received_PrintsMintedUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);

            var receiveHandler = new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await receiveHandler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = 7 } },
            }, CancellationToken.None);

            var labelsHandler = new GetPurchaseReceivingLabelsPdfQueryHandler(scope.Db, scope.PdfDocumentService);
            var file = await labelsHandler.Handle(new GetPurchaseReceivingLabelsPdfQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None);

            Assert.NotEmpty(file.Content);
            Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(file.Content, 0, 4));

            var units = scope.Context.ProductUnits.Where(x => x.PurchaseItemId == scenario.Item.Id).ToList();
            Assert.Equal(7, units.Count);
        }

        [Fact]
        public async Task Handle_NothingReceivedYet_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            var labelsHandler = new GetPurchaseReceivingLabelsPdfQueryHandler(scope.Db, scope.PdfDocumentService);

            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                labelsHandler.Handle(new GetPurchaseReceivingLabelsPdfQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_UnknownPurchase_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var labelsHandler = new GetPurchaseReceivingLabelsPdfQueryHandler(scope.Db, scope.PdfDocumentService);

            await Assert.ThrowsAsync<NotFoundCustomException>(() =>
                labelsHandler.Handle(new GetPurchaseReceivingLabelsPdfQuery { PurchaseId = 999 }, CancellationToken.None));
        }
    }
}
