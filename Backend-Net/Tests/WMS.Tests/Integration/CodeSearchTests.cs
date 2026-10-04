using Application.Features.Product.Dtos;
using Application.Features.Product.Queries;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Codes and barcodes have dashes and no zero padding, so a whole code is a substring of longer ones
    /// ("14050512-12" of "14050512-123", "…-1" of "…-10"). A whole code must find that one record only;
    /// anything else stays a partial search.
    /// </summary>
    public class CodeSearchTests
    {
        private static async Task<List<ProductListDto>> Products(TestScope scope, GetProductListQuery query)
        {
            var res = await new GetProductListQueryHandler(scope.Db, FakeObjectStorage.Instance).Handle(query, CancellationToken.None);
            return ((IEnumerable<ProductListDto>)res.Data!.GetType().GetProperty("ProductList")!.GetValue(res.Data)!).ToList();
        }

        private static void SeedProducts(TestScope scope, string prefix)
        {
            var category = Seed.Category($"cat-{prefix}");
            foreach (var suffix in new[] { "12", "123", "124" })
            {
                var product = Seed.Product(category, $"کالا {suffix}");
                product.Code = $"{prefix}-{suffix}";
                product.BarCode = $"{prefix}{suffix}";
                scope.Context.Products.Add(product);
            }
            scope.Context.SaveChanges();
        }

        [Fact]
        public async Task AWholeProductCode_FindsThatProductOnly()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            SeedProducts(scope, "14050512");

            var found = await Products(scope, new GetProductListQuery { Code = "14050512-12" });

            Assert.Equal("14050512-12", Assert.Single(found).Code);
        }

        [Fact]
        public async Task APartialProductCode_StillFindsEveryMatch()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            SeedProducts(scope, "14050513");

            var found = await Products(scope, new GetProductListQuery { Code = "14050513-1", Take = 50 });

            Assert.Equal(3, found.Count);
        }

        [Fact]
        public async Task AWholeBarcode_FindsThatProductOnly()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            SeedProducts(scope, "14050514");

            var found = await Products(scope, new GetProductListQuery { BarCode = "1405051412" });

            Assert.Single(found);
        }
    }
}
