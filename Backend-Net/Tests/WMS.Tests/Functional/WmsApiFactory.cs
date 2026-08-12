using Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace WMS.Tests.Functional
{
    /// <summary>
    /// Boots the real WMS host (real Program.cs, real middleware pipeline, real DI graph) with
    /// only the database swapped from SQL Server to a private SQLite in-memory instance, so
    /// functional tests exercise routing, model binding, auth, and
    /// <see cref="global::WMS.Middlewares.ExceptionHandlingMiddleware"/> exactly as they run in
    /// production.
    /// </summary>
    public sealed class WmsApiFactory : WebApplicationFactory<WMS.Program>, IDisposable
    {
        private readonly SqliteConnection _connection = new("DataSource=:memory:");

        public WmsApiFactory()
        {
            _connection.Open();
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");

            builder.ConfigureServices(services =>
            {
                // Removing only DbContextOptions<WMSDbContext> is not enough: AddDbContext also
                // stashes the original UseSqlServer(...) callback as a singleton
                // IDbContextOptionsConfiguration<WMSDbContext>, and if that survives, EF applies
                // it on top of our UseSqlite(...) callback below - producing a DbContextOptions
                // with both providers attached and a runtime "only a single database provider"
                // failure. Both registrations have to go before re-adding.
                services.RemoveAll<DbContextOptions<WMSDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<WMSDbContext>>();

                services.AddDbContext<WMSDbContext>(options => options.UseSqlite(_connection));

                using var scope = services.BuildServiceProvider().CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<WMSDbContext>();
                context.Database.EnsureCreated();
            });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing)
                _connection.Dispose();
        }
    }
}
