using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Domain.Enums;
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

            var response = await client.GetAsync(path, TestContext.Current.CancellationToken);

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
            }, cancellationToken: TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

            var listResponse = await client.GetAsync("/api/Customer/GetCustomerList?FullName=" + Uri.EscapeDataString("علی"), TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

            var body = await listResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
            using var doc = JsonDocument.Parse(body);
            var data = GetProperty(doc.RootElement, "data");
            var list = GetProperty(data, "customerList");

            Assert.True(list.GetArrayLength() >= 1);
        }

        // Production wiring: AuditScope reaches the DbContext through AddDbContext and AuditBehavior names the command,
        // so a write through the API is one event, recorded as the signed-in user.
        [Fact]
        public async Task CreateCustomer_ThroughTheApi_IsRecordedInTheAuditLog()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var createResponse = await client.PostAsJsonAsync("/api/Customer/CreateCustomer", new
            {
                FirstName = "ممیز",
                LastName = "رضایی",
                PhoneNumber = "09121234567",
                Address = "تهران",
                PostalCode = "1234567890",
                BalanceType = 0,
            }, cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

            var listResponse = await client.GetAsync($"/api/Audit/GetAuditEventList?action={(int)AuditActionEnum.CreateCustomer}", TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
            using var listDoc = JsonDocument.Parse(await listResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
            var newest = GetProperty(GetProperty(listDoc.RootElement, "data"), "auditEventList")[0];
            Assert.NotEqual(JsonValueKind.Null, GetProperty(newest, "userId").ValueKind);
            Assert.Equal("ایجاد مشتری", GetProperty(newest, "actionTitle").GetString());

            var detailResponse = await client.GetAsync($"/api/Audit/GetAuditEventDetail?id={GetProperty(newest, "id").GetInt64()}", TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, detailResponse.StatusCode);
            using var detailDoc = JsonDocument.Parse(await detailResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
            var change = GetProperty(GetProperty(detailDoc.RootElement, "data"), "changes")[0];
            Assert.Equal("Customer", GetProperty(change, "entityType").GetString());
            var firstName = GetProperty(change, "fields").EnumerateArray().Single(f => GetProperty(f, "name").GetString() == "FirstName");
            Assert.Equal("ممیز", GetProperty(firstName, "newValue").GetString());
            Assert.Equal(JsonValueKind.Null, GetProperty(firstName, "oldValue").ValueKind);
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
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/Customer/GetCustomerList?FullName=" + Uri.EscapeDataString("تصویر"), TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
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
            }, cancellationToken: TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task DeleteCustomer_UnknownId_Returns404()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.DeleteAsync("/api/Customer/DeleteCustomer?Id=987654", TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task CreateProductCategory_ThenUpdateAndDelete_RoundTrips()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var createResponse = await client.PostAsJsonAsync("/api/ProductCategory/CreateProductCategory", new { Name = "دسته آزمایشی" }, cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

            var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
            var categoryId = context.ProductCategories.OrderByDescending(x => x.Id).First().Id;

            var updateResponse = await client.PutAsJsonAsync("/api/ProductCategory/UpdateProductCategory", new { Id = categoryId, Name = "دسته به‌روزشده" }, cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

            var deleteResponse = await client.DeleteAsync($"/api/ProductCategory/DeleteProductCategory?Id={categoryId}", TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        }

        private static HttpRequestMessage CreateCategoryRequest(string name, string? idempotencyKey)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/ProductCategory/CreateProductCategory")
            {
                Content = JsonContent.Create(new { Name = name }),
            };
            if (idempotencyKey != null)
                request.Headers.Add("Idempotency-Key", idempotencyKey);
            return request;
        }

        [Fact]
        public async Task IdempotencyKey_RepeatedWrite_IsReplayed_NotRunTwice()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var name = $"دسته-{Guid.NewGuid():N}";
            var key = Guid.NewGuid().ToString();

            var first = await client.SendAsync(CreateCategoryRequest(name, key), TestContext.Current.CancellationToken);
            var second = await client.SendAsync(CreateCategoryRequest(name, key), TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.OK, first.StatusCode);
            Assert.Equal(HttpStatusCode.OK, second.StatusCode);
            Assert.False(first.Headers.Contains("Idempotency-Replayed"));
            Assert.Equal("true", second.Headers.GetValues("Idempotency-Replayed").Single());
            Assert.Equal(await first.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), await second.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));

            var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
            Assert.Equal(1, context.ProductCategories.Count(x => x.Name == name));

            // The same key on a different request is refused, not replayed.
            var reused = await client.SendAsync(CreateCategoryRequest(name + "-دیگر", key), TestContext.Current.CancellationToken);
            Assert.Equal((HttpStatusCode)422, reused.StatusCode);

            // Without a key nothing is deduplicated.
            await client.SendAsync(CreateCategoryRequest(name, null), TestContext.Current.CancellationToken);
            Assert.Equal(2, context.ProductCategories.Count(x => x.Name == name));
        }

        [Fact]
        public async Task IdempotencyKey_FailedWrite_ReleasesTheKey()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var key = Guid.NewGuid().ToString();

            var failed = await client.SendAsync(CreateCategoryRequest("", key), TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.BadRequest, failed.StatusCode);

            var retried = await client.SendAsync(CreateCategoryRequest($"دسته-{Guid.NewGuid():N}", key), TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, retried.StatusCode);
            Assert.False(retried.Headers.Contains("Idempotency-Replayed"));
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
            var department = Seed.Department($"dept-{++_userSeq}");
            var team = Seed.Team(department, $"team-{_userSeq}");
            var user = Seed.User(department, team, username: username, password: "Test@1234");

            context.Users.Add(user);
            context.SaveChanges();

            // Every endpoint these tests call is guarded by a permission now.
            Seed.GrantAllPermissions(context, user.Id);
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
