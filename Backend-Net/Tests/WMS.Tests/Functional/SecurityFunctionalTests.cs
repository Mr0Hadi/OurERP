using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using WMS.Tests.Support;

namespace WMS.Tests.Functional
{
    /// <summary>
    /// Through the real pipeline: the forced password change, single session, the login rate limit
    /// and the security headers - things that live in middleware, so handler tests cannot see them.
    /// </summary>
    public class SecurityFunctionalTests : IClassFixture<WmsApiFactory>
    {
        private const string Password = "Test@1234";

        private readonly WmsApiFactory _factory;

        public SecurityFunctionalTests(WmsApiFactory factory)
        {
            _factory = factory;
        }

        private string SeedUser(bool mustChangePassword = false, params Domain.Enums.PermissionEnum[] only)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
            var suffix = Guid.NewGuid().ToString("N");
            var department = Seed.Department($"dept-{suffix}");
            var team = Seed.Team(department, $"team-{suffix}");
            var user = Seed.User(department, team, username: $"user-{suffix}", password: Password);
            user.MustChangePassword = mustChangePassword;
            context.Users.Add(user);
            context.SaveChanges();
            if (only.Length == 0)
                Seed.GrantAllPermissions(context, user.Id);
            else
            {
                foreach (var permission in only)
                    context.UserPermissions.Add(new Domain.Entities.UserPermission { UserId = user.Id, Permission = permission, GrantedAt = DateTime.Now });
                context.SaveChanges();
            }
            return user.Username;
        }

        private static async Task<JsonElement> ReadAsync(HttpResponseMessage response)
        {
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return doc.RootElement.Clone();
        }

        private static JsonElement Get(JsonElement element, string camel) =>
            element.TryGetProperty(camel, out var value) ? value : element.GetProperty(char.ToUpperInvariant(camel[0]) + camel[1..]);

        private async Task<string> LoginAsync(HttpClient client, string username)
        {
            var response = await client.PostAsJsonAsync("/api/Account/Login", new { Username = username, Password });
            response.EnsureSuccessStatusCode();
            return Get(Get(await ReadAsync(response), "data"), "accessToken").GetString()!;
        }

        private static HttpRequestMessage Authorized(HttpMethod method, string url, string token, object? body = null)
        {
            var request = new HttpRequestMessage(method, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            if (body != null)
                request.Content = JsonContent.Create(body);
            return request;
        }

        [Fact]
        public async Task AfterAReset_OnlyTheChangePasswordScreenWorks_UntilThePasswordIsChanged()
        {
            var username = SeedUser(mustChangePassword: true);
            var client = _factory.CreateClient();
            var token = await LoginAsync(client, username);

            var blocked = await client.SendAsync(Authorized(HttpMethod.Get, "/api/Product/GetProductList", token));
            Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
            Assert.True(Get(Get(await ReadAsync(blocked), "data"), "mustChangePassword").GetBoolean());

            var profile = await client.SendAsync(Authorized(HttpMethod.Get, "/api/User/GetUserInfo", token));
            Assert.Equal(HttpStatusCode.OK, profile.StatusCode);

            var changed = await client.SendAsync(Authorized(HttpMethod.Put, "/api/User/ChangePassword", token,
                new { OldPassword = Password, Password = "Fresh@12345", RePassword = "Fresh@12345" }));
            Assert.Equal(HttpStatusCode.OK, changed.StatusCode);
            var newToken = Get(Get(await ReadAsync(changed), "data"), "accessToken").GetString()!;

            var oldTokenNow = await client.SendAsync(Authorized(HttpMethod.Get, "/api/Product/GetProductList", token));
            Assert.Equal(HttpStatusCode.Unauthorized, oldTokenNow.StatusCode);

            var allowed = await client.SendAsync(Authorized(HttpMethod.Get, "/api/Product/GetProductList", newToken));
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        [Fact]
        public async Task ASecondLogin_LogsTheFirstSessionOut()
        {
            var username = SeedUser();
            var client = _factory.CreateClient();

            var first = await LoginAsync(client, username);
            var second = await LoginAsync(client, username);

            var withFirst = await client.SendAsync(Authorized(HttpMethod.Get, "/api/Product/GetProductList", first));
            var withSecond = await client.SendAsync(Authorized(HttpMethod.Get, "/api/Product/GetProductList", second));

            Assert.Equal(HttpStatusCode.Unauthorized, withFirst.StatusCode);
            Assert.Equal(HttpStatusCode.OK, withSecond.StatusCode);
        }

        [Fact]
        public async Task ACashierWithOnlyPosCharge_SeesTheDeviceList_ButNotWithoutIt()
        {
            var client = _factory.CreateClient();

            var cashier = await LoginAsync(client, SeedUser(false, Domain.Enums.PermissionEnum.PosCharge));
            var allowed = await client.SendAsync(Authorized(HttpMethod.Get, "/api/PosTerminal/GetPosTerminalList", cashier));
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);

            var other = await LoginAsync(client, SeedUser(false, Domain.Enums.PermissionEnum.SaleView));
            var refused = await client.SendAsync(Authorized(HttpMethod.Get, "/api/PosTerminal/GetPosTerminalList", other));
            Assert.Equal(HttpStatusCode.Forbidden, refused.StatusCode);
        }

        [Fact]
        public async Task ACardPayment_RecordsWhoEnteredIt()
        {
            int saleId, terminalId;
            using (var scope = _factory.Services.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
                saleId = Seed.ShippedSale(context).Sale.Id;
                var terminal = new Domain.Entities.PosTerminal { Name = $"pos-{Guid.NewGuid():N}", Vendor = Domain.Enums.PosVendorEnum.Other, Host = "127.0.0.1", Port = 8080, IsActive = true };
                context.PosTerminals.Add(terminal);
                context.SaveChanges();
                terminalId = terminal.Id;
            }

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, SeedUser(false, Domain.Enums.PermissionEnum.SalePayment, Domain.Enums.PermissionEnum.PosManualRecord));

            var response = await client.SendAsync(Authorized(HttpMethod.Post, "/api/Sale/AddSalePayment", token, new
            {
                SaleId = saleId, Type = 3, Amount = 5000, TransferRef = $"rrn-{Guid.NewGuid():N}"[..20], PosTerminalId = terminalId,
            }));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var row = Get(Get(await ReadAsync(response), "data"), "paymentDetails").EnumerateArray()
                .Single(x => Get(x, "posTerminalId").ValueKind == JsonValueKind.Number);
            Assert.Equal("کاربر تست", Get(row, "recordedByName").GetString());
            Assert.Equal(2, Get(row, "source").GetInt32());
        }

        [Fact]
        public async Task EveryResponse_CarriesTheSecurityHeaders()
        {
            var response = await _factory.CreateClient().GetAsync("/api/Product/GetProductList");

            Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
            Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
            Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
        }

        [Fact]
        public async Task TooManyLoginAttemptsFromOneIp_Get429WithAPersianMessage()
        {
            using var limited = _factory.WithWebHostBuilder(builder => builder.UseSetting("LoginSecurity:RateLimitPerMinutePerIp", "3"));
            var client = limited.CreateClient();

            for (var i = 0; i < 3; i++)
            {
                var allowed = await client.PostAsJsonAsync("/api/Account/Login", new { Username = "nobody", Password = "Wrong@1234" });
                Assert.NotEqual(HttpStatusCode.TooManyRequests, allowed.StatusCode);
            }

            var rejected = await client.PostAsJsonAsync("/api/Account/Login", new { Username = "nobody", Password = "Wrong@1234" });

            Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
            Assert.True(rejected.Headers.Contains("Retry-After"));
            Assert.Contains("ورود", Get(await ReadAsync(rejected), "message").GetString());
        }
    }
}
