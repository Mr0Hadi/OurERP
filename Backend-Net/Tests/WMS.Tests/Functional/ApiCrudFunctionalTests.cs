using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using WMS.Tests.Support;

namespace WMS.Tests.Functional
{
    /// <summary>
    /// Same real-host approach as <see cref="ApiFunctionalTests"/>, aimed at the plain CRUD
    /// controllers (Customer/Supplier/ProductCategory) rather than the returns features.
    /// </summary>
    public class ApiCrudFunctionalTests : IClassFixture<WmsApiFactory>
    {
        private readonly WmsApiFactory _factory;

        public ApiCrudFunctionalTests(WmsApiFactory factory)
        {
            _factory = factory;
        }

        [Theory]
        [InlineData("/api/Customer/GetCustomerList")]
        [InlineData("/api/Supplier/GetSupplierList")]
        [InlineData("/api/ProductCategory/GetProductCategoryList")]
        [InlineData("/api/Purchase/GetPurchaseList")]
        [InlineData("/api/Sale/GetSaleList")]
        [InlineData("/api/PurchaseReturn/GetPurchaseReturnList")]
        [InlineData("/api/SaleReturn/GetSaleReturnList")]
        public async Task ProtectedEndpoints_WithoutToken_Return401(string path)
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync(path);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task CreateCustomer_ThenGetCustomerList_RoundTripsThroughRealHost()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var createResponse = await client.PostAsJsonAsync("/api/Customer/CreateCustomer", new
            {
                FirstName = "علی",
                LastName = "رضایی",
                PhoneNumber = "09121234567",
                Address = "تهران",
                PostalCode = "1234567890",
                BalanceType = 0,
            });

            Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

            var listResponse = await client.GetAsync("/api/Customer/GetCustomerList?FullName=" + Uri.EscapeDataString("علی"));
            Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

            var body = await listResponse.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var data = GetProperty(doc.RootElement, "data");
            var list = GetProperty(data, "customerList");

            Assert.True(list.GetArrayLength() >= 1);
        }

        // appsettings.json ships the ObjectStorage section with blank credentials, so the real DI
        // graph here builds an unconfigured IObjectStorageService. A stored image key must then
        // degrade to a null ImageUrl rather than 500 the whole list - see
        // LiaraObjectStorageService.IsConfigured.
        [Fact]
        public async Task GetCustomerList_WithStoredImageKey_AndUnconfiguredBucket_StillReturns200()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
            context.Customers.Add(new Domain.Entities.Customer
            {
                FirstName = "تصویر",
                LastName = "دار",
                PhoneNumber = "09120000000",
                Address = "تهران",
                PostalCode = "1234567890",
                ImageUrl = "customers/2026/08/abc.jpg",
                IsActive = true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
            });
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/Customer/GetCustomerList?FullName=" + Uri.EscapeDataString("تصویر"));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var item = GetProperty(GetProperty(doc.RootElement, "data"), "customerList")[0];

            Assert.Equal("customers/2026/08/abc.jpg", GetProperty(item, "imageKey").GetString());
            Assert.Equal(JsonValueKind.Null, GetProperty(item, "imageUrl").ValueKind);
        }

        [Fact]
        public async Task CreateSupplier_WithInvalidPhone_Returns400()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.PostAsJsonAsync("/api/Supplier/CreateSupplier", new
            {
                FirstName = "رضا",
                LastName = "محمدی",
                CompanyName = "شرکت",
                Phone = "not-a-phone",
                Address = "تهران",
                PostalCode = "1234567890",
                BalanceType = 0,
            });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task DeleteCustomer_UnknownId_Returns404()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.DeleteAsync("/api/Customer/DeleteCustomer?Id=987654");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task CreateProductCategory_ThenUpdateAndDelete_RoundTrips()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var createResponse = await client.PostAsJsonAsync("/api/ProductCategory/CreateProductCategory", new { Name = "دسته آزمایشی" });
            Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

            var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
            var categoryId = context.ProductCategories.OrderByDescending(x => x.Id).First().Id;

            var updateResponse = await client.PutAsJsonAsync("/api/ProductCategory/UpdateProductCategory", new { Id = categoryId, Name = "دسته به‌روزشده" });
            Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

            var deleteResponse = await client.DeleteAsync($"/api/ProductCategory/DeleteProductCategory?Id={categoryId}");
            Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        }

        private static JsonElement GetProperty(JsonElement element, string camelCaseName)
        {
            if (element.TryGetProperty(camelCaseName, out var camel))
                return camel;

            var pascalCaseName = char.ToUpperInvariant(camelCaseName[0]) + camelCaseName[1..];
            return element.GetProperty(pascalCaseName);
        }

        private static int _userSeq;

        private static void SeedAdminUser(WMSDbContext context, string username)
        {
            var role = Seed.Role(Domain.Enums.UserRolesEnum.Admin);
            var existingRole = context.Roles.FirstOrDefault(r => r.Id == role.Id);
            if (existingRole != null)
                role = existingRole;

            var department = Seed.Department($"dept-{++_userSeq}");
            var team = Seed.Team(department, $"team-{_userSeq}");
            var user = Seed.User(role, department, team, username: username, password: "Test@1234");

            context.Users.Add(user);
            context.SaveChanges();
        }

        private async Task<string> LoginAsSeededAdmin(IServiceScope scope)
        {
            var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
            var username = $"admin-{Guid.NewGuid():N}";
            SeedAdminUser(context, username);

            var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/Account/Login", new { Username = username, Password = "Test@1234" });

            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var data = GetProperty(doc.RootElement, "data");
            var accessToken = GetProperty(data, "accessToken");

            return accessToken.GetString()!;
        }
    }
}
