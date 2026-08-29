using Application.Features.Product.Commands;
using Application.Features.Product.Dtos;
using Application.Features.Product.Queries;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class ProductHandlerTests
    {
        [Fact]
        public async Task CreateProduct_PersistsActiveProduct()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            scope.Context.ProductCategories.Add(category);
            scope.Context.SaveChanges();

            var handler = new CreateProductCommandHandler(scope.ProductRepository, TestMapper.Instance, scope.ProductCodeService, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await handler.Handle(new CreateProductCommand
            {
                Name = "کالای تست",
                Brand = "برند",
                PurchasePrice = 100,
                RetailPrice = 150,
                WholeSalePrice = 140,
                Tax = 0,
                Stock = 10,
                LowStockThreshold = 2,
                ProductCategoryId = category.Id,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var product = Assert.Single(verify.Products);
            Assert.True(product.IsActive);
            Assert.Equal(10, product.Stock);
        }

        [Fact]
        public async Task CreateProduct_GeneratesCodeAndMintsMatchingUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            scope.Context.ProductCategories.Add(category);
            scope.Context.SaveChanges();

            var handler = new CreateProductCommandHandler(scope.ProductRepository, TestMapper.Instance, scope.ProductCodeService, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await handler.Handle(new CreateProductCommand
            {
                Name = "کالای تست",
                Brand = "برند",
                PurchasePrice = 100,
                RetailPrice = 150,
                WholeSalePrice = 140,
                Stock = 3,
                ProductCategoryId = category.Id,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var product = Assert.Single(verify.Products);

            // Code is Date(8)-ProductId(10); BarCode is the same digits with the dash stripped.
            Assert.Matches(@"^\d{8}-\d{10}$", product.Code);
            Assert.Equal(product.Code.Replace("-", ""), product.BarCode);
            Assert.Equal(18, product.BarCode.Length);

            var units = verify.ProductUnits.Where(x => x.ProductId == product.Id).OrderBy(x => x.SerialNumber).ToList();
            Assert.Equal(3, units.Count);
            Assert.All(units, u => Assert.Equal(ProductUnitStatusEnum.IN_STOCK, u.Status));
            Assert.Equal(new[] { 1, 2, 3 }, units.Select(u => u.SerialNumber).ToArray());
            Assert.Equal($"{product.Code}-0000000002", units[1].Barcode);
            Assert.Equal(28, units[1].BarcodePayload.Length);
        }

        [Fact]
        public async Task UpdateProduct_UnknownId_ThrowsValidationException()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new UpdateProductCommandHandler(scope.ProductRepository, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

            // UpdateProductCommandHandler throws ValidationCustomException (not NotFound) on a
            // missing row - inconsistent with every other feature's Update handler, but this is
            // the actual behavior.
            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UpdateProductCommand
            {
                Id = 999,
                Name = "کالا",
                Brand = "برند",
                PurchasePrice = 100,
                RetailPrice = 150,
                WholeSalePrice = 140,
                ProductCategoryId = 1,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task UpdateProduct_ExistingId_UpdatesStockAndPrice()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var product = Seed.Product(category, stock: 5);
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();

            var handler = new UpdateProductCommandHandler(scope.ProductRepository, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await handler.Handle(new UpdateProductCommand
            {
                Id = product.Id,
                Name = product.Name,
                Brand = product.Brand,
                PurchasePrice = 200,
                RetailPrice = 300,
                WholeSalePrice = 280,
                Stock = 50,
                ProductCategoryId = category.Id,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var updated = verify.Products.Single(x => x.Id == product.Id);
            Assert.Equal(50, updated.Stock);
            Assert.Equal(300UL, updated.RetailPrice);
        }

        [Fact]
        public async Task UpdateProduct_RaisingStock_MintsUnitsToMatch()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var product = Seed.Product(category, stock: 5);
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();
            Seed.MintUnits(scope.Context, product, 5);

            var handler = new UpdateProductCommandHandler(scope.ProductRepository, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await handler.Handle(new UpdateProductCommand
            {
                Id = product.Id,
                Name = product.Name,
                Brand = product.Brand,
                PurchasePrice = 200,
                RetailPrice = 300,
                WholeSalePrice = 280,
                Stock = 8,
                ProductCategoryId = category.Id,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(8, verify.Products.Single(x => x.Id == product.Id).Stock);
            Assert.Equal(8, verify.ProductUnits.Count(x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK));
        }

        [Fact]
        public async Task UpdateProduct_LoweringStock_ScrapsNewestUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var product = Seed.Product(category, stock: 5);
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();
            Seed.MintUnits(scope.Context, product, 5);

            var handler = new UpdateProductCommandHandler(scope.ProductRepository, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);
            await handler.Handle(new UpdateProductCommand
            {
                Id = product.Id,
                Name = product.Name,
                Brand = product.Brand,
                PurchasePrice = 200,
                RetailPrice = 300,
                WholeSalePrice = 280,
                Stock = 2,
                ProductCategoryId = category.Id,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(2, verify.Products.Single(x => x.Id == product.Id).Stock);
            Assert.Equal(2, verify.ProductUnits.Count(x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK));
            Assert.Equal(3, verify.ProductUnits.Count(x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.SCRAPPED));
        }

        [Fact]
        public async Task DeleteProduct_SetsIsActiveFalse()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var product = Seed.Product(category);
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();

            var handler = new DeleteProductCommandHandler(scope.ProductRepository, scope.UnitOfWork);
            await handler.Handle(new DeleteProductCommand { Id = product.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.Products.Single(x => x.Id == product.Id).IsActive);
        }

        [Fact]
        public async Task GetProductDetail_ReturnsMappedDto()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var product = Seed.Product(category, name: "کالای خاص");
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();

            var handler = new GetProductDetailQueryHandler(scope.ProductRepository, TestMapper.Instance, FakeObjectStorage.Instance);
            var res = await handler.Handle(new GetProductDetailQuery { Id = product.Id }, CancellationToken.None);

            var dto = Assert.IsType<ProductDto>(res.Data);
            Assert.Equal("کالای خاص", dto.Name);
        }

        [Fact]
        public async Task GetProductList_FiltersByLowStock()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var low = Seed.Product(category, "کم موجود", stock: 1);
            low.LowStockThreshold = 5;
            var healthy = Seed.Product(category, "پرموجود", stock: 100);
            healthy.LowStockThreshold = 5;
            scope.Context.Products.AddRange(low, healthy);
            scope.Context.SaveChanges();

            var handler = new GetProductListQueryHandler(scope.Db, FakeObjectStorage.Instance);
            var res = await handler.Handle(new GetProductListQuery { IsLowOnStock = true }, CancellationToken.None);

            var data = res.Data!;
            var list = (System.Collections.IEnumerable)data.GetType().GetProperty("ProductList")!.GetValue(data)!;

            Assert.Single(list.Cast<object>());
        }
    }
}
