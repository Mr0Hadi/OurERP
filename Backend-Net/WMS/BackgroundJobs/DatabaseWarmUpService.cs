using Application.Common.Contracts.Context;
using Microsoft.EntityFrameworkCore;

namespace WMS.BackgroundJobs
{
    /// <summary>
    /// Runs one light query as soon as the app starts, so building the EF model and opening the first database connection
    /// happen then and not inside the first real request - typically a login after the application pool was recycled
    /// (frontend-requests 20.1). A failure is only logged: the app works without it, just slower on the first request.
    /// </summary>
    public sealed class DatabaseWarmUpService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<DatabaseWarmUpService> _logger;

        public DatabaseWarmUpService(IServiceScopeFactory scopeFactory, ILogger<DatabaseWarmUpService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<IWMSDbContext>();
                await context.Users.AnyAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Database warm-up query failed.");
            }
        }
    }
}
