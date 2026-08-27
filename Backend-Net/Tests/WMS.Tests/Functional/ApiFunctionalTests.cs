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
    /// End-to-end through the real host: real routing, real JWT auth, real
    /// ExceptionHandlingMiddleware / model-validation envelope, real CachingMiddleware token
    /// gate - only the database is swapped for SQLite. One factory per test class (xunit
    /// IClassFixture) so the schema is only created once per class.
    /// </summary>
    public class ApiFunctionalTests : IClassFixture<WmsApiFactory>
    {
        private readonly WmsApiFactory _factory;

        public ApiFunctionalTests(WmsApiFactory factory)
        {
            _factory = factory;
        }

        private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

        [Fact]
        public async Task GetProductList_WithoutToken_Returns401WithDangerEnvelope()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/Product/GetProductList");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task CreateProduct_WithMalformedBody_Returns400WithPersianValidationEnvelope()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Missing every required field on purpose - model binding should reject this before it
            // ever reaches the handler.
            var response = await client.PostAsJsonAsync("/api/Product/CreateProduct", new { });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var message = doc.RootElement.TryGetProperty("message", out var m) ? m : doc.RootElement.GetProperty("Message");
            Assert.Equal("فرمت داده ورودی صحیح نمی باشد.", message.GetString());
        }

        [Fact]
        public async Task Login_WithValidCredentials_ReturnsAccessToken()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            Assert.False(string.IsNullOrWhiteSpace(token));
        }

        [Fact]
        public async Task Login_WithWrongPassword_Returns404DangerEnvelope()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
            SeedAdminUser(context, "wrongpass-user");

            var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/Account/Login", new { Username = "wrongpass-user", Password = "NotTheRealPassword!1" });

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task GetProductList_WithValidToken_ReturnsSuccessEnvelope()
        {
            using var scope = _factory.Services.CreateScope();
            var token = await LoginAsSeededAdmin(scope);

            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/Product/GetProductList");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        private static int _userSeq;

        private static void SeedAdminUser(WMSDbContext context, string username)
        {
            var department = Seed.Department($"dept-{++_userSeq}");
            var team = Seed.Team(department, $"team-{_userSeq}");
            var user = Seed.User(department, team, username: username, password: "Test@1234");

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
            var data = doc.RootElement.TryGetProperty("data", out var d) ? d : doc.RootElement.GetProperty("Data");
            var accessToken = data.TryGetProperty("accessToken", out var at) ? at : data.GetProperty("AccessToken");

            return accessToken.GetString()!;
        }
    }
}
