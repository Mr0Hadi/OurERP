using Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace WMS.Tests.Functional
{
    /// <summary>
    /// Boots the real WMS host (real Program.cs, real middleware pipeline, real DI graph) against
    /// a throwaway SQL Server database (same server as production, "Server=." per
    /// WMS/appsettings.json) instead of the configured production database, so functional tests
    /// exercise routing, model binding, auth, and
    /// <see cref="global::WMS.Middlewares.ExceptionHandlingMiddleware"/> exactly as they run in
    /// production - including SQL Server-only features like the User.PersonelCode sequence, which
    /// SQLite can't emulate.
    /// </summary>
    public sealed class WmsApiFactory : WebApplicationFactory<WMS.Program>, IDisposable
    {
        private readonly string _connectionString = $"Server=.;Database=WMS_Test_{Guid.NewGuid():N};Trusted_Connection=True;TrustServerCertificate=True";

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");

            builder.ConfigureServices(services =>
            {
                // Removing only DbContextOptions<WMSDbContext> is not enough: AddDbContext also
                // stashes the original UseSqlServer(...) callback as a singleton
                // IDbContextOptionsConfiguration<WMSDbContext>, and if that survives, EF applies
                // it on top of our UseSqlServer(...) callback below - producing a DbContextOptions
                // with both providers attached and a runtime "only a single database provider"
                // failure. Both registrations have to go before re-adding.
                services.RemoveAll<DbContextOptions<WMSDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<WMSDbContext>>();

                services.AddDbContext<WMSDbContext>(options => options.UseSqlServer(_connectionString));

                using var scope = services.BuildServiceProvider().CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
                context.Database.EnsureCreated();
            });
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                using var context = new WMSDbContext(new DbContextOptionsBuilder<WMSDbContext>().UseSqlServer(_connectionString).Options);
                context.Database.EnsureDeleted();
            }
            base.Dispose(disposing);
        }
    }
}
