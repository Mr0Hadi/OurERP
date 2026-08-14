using Application.Features.ProductCategory.Commands;
using Application.Features.ProductCategory.Dtos;
using Application.Features.ProductCategory.Queries;
using Common.Exceptions;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class ProductCategoryHandlerTests
    {
        [Fact]
        public async Task CreateProductCategory_Persists()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new CreateProductCategoryCommandHandler(scope.ProductCategoryRepository, TestMapper.Instance, scope.UnitOfWork);
            await handler.Handle(new CreateProductCategoryCommand { Name = "لوازم خانگی" }, CancellationToken.None);

            using var verify = db.NewContext();
            var category = Assert.Single(verify.ProductCategories);
            Assert.True(category.IsActive);
        }

        [Fact]
        public async Task UpdateProductCategory_UnknownId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new UpdateProductCategoryCommandHandler(scope.ProductCategoryRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new UpdateProductCategoryCommand { Id = 999, Name = "x" }, CancellationToken.None));
        }

        [Fact]
        public async Task DeleteProductCategory_SetsIsActiveFalse()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            scope.Context.ProductCategories.Add(category);
            scope.Context.SaveChanges();

            var handler = new DeleteProductCategoryCommandHandler(scope.ProductCategoryRepository, scope.UnitOfWork);
            await handler.Handle(new DeleteProductCategoryCommand { Id = category.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.ProductCategories.Single(x => x.Id == category.Id).IsActive);
        }

        [Fact]
        public async Task GetProductCategoryDetail_ReturnsMappedDto()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category("پوشاک");
            scope.Context.ProductCategories.Add(category);
            scope.Context.SaveChanges();

            var handler = new GetProductCategoryDetailQueryHandler(scope.ProductCategoryRepository, TestMapper.Instance);
            var res = await handler.Handle(new GetProductCategoryDetailQuery { Id = category.Id }, CancellationToken.None);

            var dto = Assert.IsType<ProductCategoryDto>(res.Data);
            Assert.Equal("پوشاک", dto.Name);
        }

        [Fact]
        public async Task GetProductCategoryList_IncludesProductCount()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category("ابزار");
            var product = Seed.Product(category);
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();

            var handler = new GetProductCategoryListQueryHandler(scope.Db);
            var res = await handler.Handle(new GetProductCategoryListQuery { Name = "ابزار" }, CancellationToken.None);

            var data = res.Data!;
            var list = (System.Collections.IEnumerable)data.GetType().GetProperty("ProductCategoryList")!.GetValue(data)!;
            var first = list.Cast<object>().Single();
            var productCount = (int)first.GetType().GetProperty("ProductCount")!.GetValue(first)!;

            Assert.Equal(1, productCount);
        }
    }
}
