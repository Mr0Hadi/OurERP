using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    // The unit service never makes up a shortfall: a request it cannot satisfy with exactly the
    // right units throws, and nothing it staged is saved.
    public class ProductUnitServiceTests
    {
        [Fact]
        public async Task ConsumeAsync_SameBarcodeScannedTwice_ThrowsAndLeavesUnitInStock()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 10, shippedQuantity: 0, stock: 0);
            var units = await scope.ProductUnitService.MintAsync(scenario.Product, 3, null, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            // Same unit, once human-readable and once as the raw digits-only payload.
            var barcodes = new List<string> { units[0].Barcode, units[0].BarcodePayload };

            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                scope.ProductUnitService.ConsumeAsync(scenario.Product, 2, scenario.Item.Id, barcodes, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Equal(3, verify.ProductUnits.Count(x => x.ProductId == scenario.Product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK));
        }

        [Fact]
        public async Task ReturnToSupplierAsync_WithPurchaseLine_OnlyTakesUnitsFromThatLine()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);
            // Lower serials belong to no purchase line, so plain FIFO would pick them first.
            await scope.ProductUnitService.MintAsync(scenario.Product, 5, null, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);
            await scope.ProductUnitService.MintAsync(scenario.Product, 2, scenario.Item.Id, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            await scope.ProductUnitService.ReturnToSupplierAsync(scenario.Product, 2, scenario.Item.Id, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            using var verify = db.NewContext();
            var returned = verify.ProductUnits.Where(x => x.Status == ProductUnitStatusEnum.RETURNED_TO_SUPPLIER).ToList();
            Assert.Equal(2, returned.Count);
            Assert.All(returned, u => Assert.Equal(scenario.Item.Id, u.PurchaseItemId));
        }

        [Fact]
        public async Task ReturnToSupplierAsync_NotEnoughUnitsFromPurchaseLine_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);
            await scope.ProductUnitService.MintAsync(scenario.Product, 5, null, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);
            await scope.ProductUnitService.MintAsync(scenario.Product, 2, scenario.Item.Id, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            // Product has 7 IN_STOCK units, but only 2 came in on this line.
            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                scope.ProductUnitService.ReturnToSupplierAsync(scenario.Product, 3, scenario.Item.Id, CancellationToken.None));
        }

        [Fact]
        public async Task RestoreAsync_MoreThanSoldOnSaleLine_Throws()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 3, shippedQuantity: 3, stock: 0);

            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                scope.ProductUnitService.RestoreAsync(scenario.Item.Id, 3, 2, CancellationToken.None));
        }

        [Fact]
        public async Task RestoreAsync_WithinSoldOnSaleLine_RestocksHealthyAndScrapsRest()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 3, shippedQuantity: 3, stock: 0);

            await scope.ProductUnitService.RestoreAsync(scenario.Item.Id, 2, 1, CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(2, verify.ProductUnits.Count(x => x.ProductId == scenario.Product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK));
            Assert.Equal(1, verify.ProductUnits.Count(x => x.ProductId == scenario.Product.Id && x.Status == ProductUnitStatusEnum.SCRAPPED));
        }
    }
}
