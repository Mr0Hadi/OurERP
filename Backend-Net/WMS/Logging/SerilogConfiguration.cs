using Serilog.Events;
using Serilog;

namespace WMS.Logging
{
    public static class SerilogConfiguration
    {
        public static void ConfigureLogger(IConfiguration configuration)
        {
            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Information()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .Enrich.FromLogContext()
                .WriteTo.File(
                    path: Path.Combine(Environment.CurrentDirectory, "Logs/Requests/request-.log"),
                    rollingInterval: RollingInterval.Day,
                    fileSizeLimitBytes: 1_000_000_000, // 1 GB
                    retainedFileCountLimit: 10,
                    restrictedToMinimumLevel: LogEventLevel.Information,
                    outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"
                )
                .WriteTo.File(
                    path: Path.Combine(Environment.CurrentDirectory, "Logs/Errors/error-.log"),
                    rollingInterval: RollingInterval.Day,
                    fileSizeLimitBytes: 1_000_000_000,
                    retainedFileCountLimit: 10,
                    restrictedToMinimumLevel: LogEventLevel.Error,
                    outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"
                )
                //.WriteTo.OpenTelemetry(options =>
                //{
                //    //options.Endpoint = "http://localhost:4318";
                //    options.Endpoint = configuration["Grafana:Logs"];
                //    options.Protocol = OtlpProtocol.HttpProtobuf;
                //    options.ResourceAttributes = new Dictionary<string, object>
                //    {
                //        ["service.name"] = "SMSHUB.API",
                //        ["service.namespace"] = "SMSHUB"
                //    };
                //})
                .CreateLogger();
        }
    }
}
