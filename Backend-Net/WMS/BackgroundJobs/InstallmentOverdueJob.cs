using Application.Features.SaleInstallment.Commands;
using MediatR;
using Microsoft.Extensions.Options;

namespace WMS.BackgroundJobs
{
    public class InstallmentOverdueJobOptions
    {
        public const string SectionName = "BackgroundJobs:InstallmentOverdue";

        public bool Enabled { get; set; } = true;

        /// <summary>Hourly by default: the flag only has to turn over once a day, and an IIS recycle must not skip a day.</summary>
        public int IntervalMinutes { get; set; } = 60;
    }

    /// <summary>
    /// Marks late installments OVERDUE (MarkOverdueSaleInstallmentsCommand) every IntervalMinutes. Only a flag for lists and
    /// screens: the penalty is computed from DueDate at payment time, so a late or skipped run never changes what is charged.
    /// </summary>
    public sealed class InstallmentOverdueJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<InstallmentOverdueJob> _logger;
        private readonly InstallmentOverdueJobOptions _options;

        public InstallmentOverdueJob(IServiceScopeFactory scopeFactory, ILogger<InstallmentOverdueJob> logger, IOptions<InstallmentOverdueJobOptions> options)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _options = options.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_options.Enabled)
                return;

            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(Math.Max(1, _options.IntervalMinutes)));
            do
            {
                try
                {
                    // Until a run finds fewer than a full batch, there may be more waiting.
                    int marked;
                    do
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var command = new MarkOverdueSaleInstallmentsCommand();
                        var result = await scope.ServiceProvider.GetRequiredService<IMediator>().Send(command, stoppingToken);
                        marked = result.Data is int count ? count : 0;
                        if (marked > 0)
                            _logger.LogInformation("Marked {Count} installment(s) overdue.", marked);
                        if (marked < command.BatchSize)
                            break;
                    }
                    while (!stoppingToken.IsCancellationRequested);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Installment overdue sweep failed.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
    }
}
