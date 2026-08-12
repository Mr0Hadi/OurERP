using Application.Features.Product.Commands;
using Application.Features.Product.Dtos;
using Application.Features.Product.Queries;
using Common.Exceptions;
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

            var handler = new CreateProductCommandHandler(scope.ProductRepository, TestMapper.Instance, scope.UnitOfWork);
            await handler.Handle(new CreateProductCommand
            {
                Name = "کالای تست",
                Code = "P-100",
                BarCode = "1234567890123",
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
        public async Task UpdateProduct_UnknownId_ThrowsValidationException()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new UpdateProductCommandHandler(scope.ProductRepository, scope.UnitOfWork);

            // UpdateProductCommandHandler throws ValidationCustomException (not NotFound) on a
            // missing row - inconsistent with every other feature's Update handler, but this is
            // the actual behavior.
            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UpdateProductCommand
            {
                Id = 999,
                Name = "کالا",
                Code = "P-1",
                BarCode = "123",
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

            var handler = new UpdateProductCommandHandler(scope.ProductRepository, scope.UnitOfWork);
            await handler.Handle(new UpdateProductCommand
            {
                Id = product.Id,
                Name = product.Name,
                Code = product.Code,
                BarCode = product.BarCode,
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

            var handler = new GetProductDetailQueryHandler(scope.ProductRepository, TestMapper.Instance);
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

            var handler = new GetProductListQueryHandler(scope.Db);
            var res = await handler.Handle(new GetProductListQuery { IsLowOnStock = true }, CancellationToken.None);

            var data = res.Data!;
            var list = (System.Collections.IEnumerable)data.GetType().GetProperty("ProductList")!.GetValue(data)!;

            Assert.Single(list.Cast<object>());
        }
    }
}
