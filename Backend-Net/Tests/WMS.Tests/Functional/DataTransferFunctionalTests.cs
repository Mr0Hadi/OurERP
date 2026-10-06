using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using WMS.Tests.Support;

namespace WMS.Tests.Functional
{
    /// <summary>
    /// The import/export endpoints called directly, the way a script would, with no frontend in front: a user without
    /// the resource's permission gets 403 whatever else they hold.
    /// </summary>
    public class DataTransferFunctionalTests : IClassFixture<WmsApiFactory>
    {
        private const string Password = "Test@1234";

        private readonly WmsApiFactory _factory;

        public DataTransferFunctionalTests(WmsApiFactory factory)
        {
            _factory = factory;
        }

        private string SeedUser(params PermissionEnum[] permissions)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
            var suffix = Guid.NewGuid().ToString("N");
            var department = Seed.Department($"dept-{suffix}");
            var team = Seed.Team(department, $"team-{suffix}");
            var user = Seed.User(department, team, username: $"user-{suffix}", password: Password);
            context.Users.Add(user);
            context.SaveChanges();
            foreach (var permission in permissions)
                context.UserPermissions.Add(new Domain.Entities.UserPermission { UserId = user.Id, Permission = permission, GrantedAt = DateTime.Now });
            context.SaveChanges();
            return user.Username;
        }

        private async Task<HttpClient> SignedInAsync(params PermissionEnum[] permissions)
        {
            var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/Account/Login", new { Username = SeedUser(permissions), Password });
            response.EnsureSuccessStatusCode();
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var data = doc.RootElement.TryGetProperty("data", out var d) ? d : doc.RootElement.GetProperty("Data");
            var token = (data.TryGetProperty("accessToken", out var t) ? t : data.GetProperty("AccessToken")).GetString();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        private static MultipartFormDataContent Upload(string resource, string csv)
        {
            var form = new MultipartFormDataContent();
            form.Add(new StringContent(resource), "resource");
            var file = new ByteArrayContent(Encoding.UTF8.GetBytes(csv));
            file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
            form.Add(file, "file", "customers.csv");
            return form;
        }

        private const string CustomerCsv = "نام,نام خانوادگی,شماره تماس,آدرس\nمریم,احمدی,09123456789,تهران\n";

        [Fact]
        public async Task Export_WithoutTheExportPermission_Is403_EvenForAViewer()
        {
            var client = await SignedInAsync(PermissionEnum.CustomerView, PermissionEnum.CustomerImport);

            var response = await client.GetAsync("/api/DataTransfer/Export?resource=customers&format=1");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Export_WithThePermission_StreamsACsvWithBom()
        {
            var client = await SignedInAsync(PermissionEnum.CustomerExport);

            var response = await client.GetAsync("/api/DataTransfer/Export?resource=customers&format=1&fullName=x");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("text/csv", response.Content.Headers.ContentType!.MediaType);
            var bytes = await response.Content.ReadAsByteArrayAsync();
            Assert.Equal(new byte[] { 0xEF, 0xBB, 0xBF }, bytes[..3]);
        }

        [Fact]
        public async Task PreviewAndCommit_WithoutTheImportPermission_Are403()
        {
            var client = await SignedInAsync(PermissionEnum.CustomerView, PermissionEnum.CustomerCreate, PermissionEnum.CustomerExport);

            var preview = await client.PostAsync("/api/DataTransfer/PreviewImport", Upload("customers", CustomerCsv));
            var commit = await client.PostAsync("/api/DataTransfer/CommitImport", Upload("customers", CustomerCsv));

            Assert.Equal(HttpStatusCode.Forbidden, preview.StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, commit.StatusCode);
        }

        [Fact]
        public async Task Import_WithOneResourcesPermission_DoesNotOpenAnother()
        {
            var client = await SignedInAsync(PermissionEnum.ProductImport);

            var response = await client.PostAsync("/api/DataTransfer/CommitImport", Upload("customers", CustomerCsv));

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Anonymous_Is401()
        {
            var response = await _factory.CreateClient().GetAsync("/api/DataTransfer/Export?resource=customers");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task UnknownResource_Is404()
        {
            var client = await SignedInAsync(PermissionEnum.CustomerExport);
            var response = await client.GetAsync("/api/DataTransfer/Export?resource=saleInvoices");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task PreviewThenCommit_ImportsTheFile()
        {
            var client = await SignedInAsync(PermissionEnum.CustomerImport);
            var csv = $"نام,نام خانوادگی,شماره تماس,آدرس\nمریم,احمدی,0912{Random.Shared.Next(1000000, 9999999)},تهران\n";

            var preview = await client.PostAsync("/api/DataTransfer/PreviewImport", Upload("customers", csv));
            Assert.Equal(HttpStatusCode.OK, preview.StatusCode);

            var commit = await client.PostAsync("/api/DataTransfer/CommitImport", Upload("customers", csv));
            Assert.Equal(HttpStatusCode.OK, commit.StatusCode);
            Assert.Contains("1 ردیف وارد شد", await commit.Content.ReadAsStringAsync());
        }

        [Fact]
        public async Task Resources_ReportOnlyWhatTheUserMayDo()
        {
            var client = await SignedInAsync(PermissionEnum.ProductExport);

            var body = await client.GetStringAsync("/api/DataTransfer/GetResources");
            using var doc = JsonDocument.Parse(body);
            var data = doc.RootElement.TryGetProperty("data", out var d) ? d : doc.RootElement.GetProperty("Data");
            var resources = (data.TryGetProperty("resources", out var r) ? r : data.GetProperty("Resources")).EnumerateArray().ToList();

            JsonElement Prop(JsonElement e, string name) => e.TryGetProperty(name, out var v) ? v : e.GetProperty(char.ToUpperInvariant(name[0]) + name[1..]);
            var products = resources.Single(x => Prop(x, "resource").GetString() == "products");
            var customers = resources.Single(x => Prop(x, "resource").GetString() == "customers");

            Assert.True(Prop(products, "canExport").GetBoolean());
            Assert.False(Prop(products, "canImport").GetBoolean());
            Assert.False(Prop(customers, "canExport").GetBoolean());
        }
    }
}
