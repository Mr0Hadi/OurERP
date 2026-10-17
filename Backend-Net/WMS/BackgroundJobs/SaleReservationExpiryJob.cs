using Application.Common.Contracts.Context;
using Application.Common.Sales;
using Application.Features.Sale.Commands;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace WMS.BackgroundJobs
{
    public class SaleReservationExpiryJobOptions
    {
        public const string SectionName = "BackgroundJobs:SaleReservationExpiry";

        public bool Enabled { get; set; } = true;
        public int IntervalSeconds { get; set; } = 60;

        /// <summary>Most sales released per run; the rest wait for the next tick.</summary>
        public int BatchSize { get; set; } = 100;
    }

    /// <summary>
    /// Puts the units of proformas whose reservation ran out back on the shelf (docs/proforma-approval-pipeline.md). Every
    /// <see cref="SaleReservationExpiryJobOptions.IntervalSeconds"/> it lists the due sales and sends one
    /// ReleaseExpiredSaleReservationCommand per sale, each in its own DI scope, so a failure only costs that sale and is
    /// retried on the next tick.
    ///
    /// Correctness does not depend on this job running on time: payment is refused from the deadline itself
    /// (SaleProformaPipeline.EnsureReadyForPayment), so an IIS app-pool recycle or idle shutdown only delays when the units
    /// become free for other proformas. The release command is idempotent; with several API instances each would just find
    /// nothing left to do, at worst one refused save.
    /// </summary>
    public sealed class SaleReservationExpiryJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SaleReservationExpiryJob> _logger;
        private readonly SaleReservationExpiryJobOptions _options;

        public SaleReservationExpiryJob(IServiceScopeFactory scopeFactory, ILogger<SaleReservationExpiryJob> logger, IOptions<SaleReservationExpiryJobOptions> options)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _options = options.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_options.Enabled)
                return;

            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Max(5, _options.IntervalSeconds)));
            do
            {
                try
                {
                    await RunOnceAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    // Never let the loop die: the database may simply be unreachable for a moment.
                    _logger.LogError(ex, "Sale reservation expiry sweep failed.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }

        /// <summary>One sweep; returns how many sales were released.</summary>
        public async Task<int> RunOnceAsync(CancellationToken cancellationToken)
        {
            List<int> saleIds;
            using (var scope = _scopeFactory.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<IWMSDbContext>();
                saleIds = await context.Sales
                    .AsNoTracking()
                    .Where(SaleProformaPipeline.ReservationDueForRelease(DateTime.Now))
                    .OrderBy(x => x.ReservationExpiresAt)
                    .ThenBy(x => x.Id)
                    .Select(x => x.Id)
                    .Take(Math.Max(1, _options.BatchSize))
                    .ToListAsync(cancellationToken);
            }

            var released = 0;
            foreach (var saleId in saleIds)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
                    var result = await mediator.Send(new ReleaseExpiredSaleReservationCommand { SaleId = saleId }, cancellationToken);
                    if (result.Data is true)
                        released++;
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogError(ex, "Releasing the expired reservation of sale {SaleId} failed; it is retried on the next sweep.", saleId);
                }
            }

            if (released > 0)
                _logger.LogInformation("Released the expired reservations of {Count} proforma(s).", released);

            return released;
        }
    }
}
