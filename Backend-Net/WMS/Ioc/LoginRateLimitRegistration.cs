using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace WMS.Ioc
{
    /// <summary>
    /// The outer layer against password guessing: a cap on login attempts per client IP. The inner
    /// layer is the per-account temporary lockout in LoginUserCommand.
    ///
    /// Deliberately generous: a warehouse or office usually reaches the internet through one public
    /// IP, so every employee's morning login counts against the same window. The cap is there to
    /// stop scripted guessing across many usernames, not to slow down people.
    ///
    /// Partitioned on <c>Connection.RemoteIpAddress</c>, never on a client-supplied header such as
    /// X-Forwarded-For (anyone can send one with a fresh value per request). Behind IIS that address
    /// is the real client: in-process hosting hands it over directly, and out-of-process hosting's
    /// IIS integration only trusts the forwarded header from IIS on the same machine. If IIS itself
    /// is ever put behind a CDN or another proxy, every request arrives from the proxy's IP and this
    /// becomes one shared limit for everyone - configure ForwardedHeaders with that proxy's address
    /// (KnownProxies) first.
    /// </summary>
    public static class LoginRateLimitRegistration
    {
        public const string PolicyName = "Login";

        public const int DefaultPermitPerMinute = 60;

        public static IServiceCollection AddLoginRateLimiting(this IServiceCollection services, IConfiguration configuration)
        {
            var permitPerMinute = int.TryParse(configuration["LoginSecurity:RateLimitPerMinutePerIp"], out var configured) && configured > 0
                ? configured
                : DefaultPermitPerMinute;

            services.AddRateLimiter(options =>
            {
                options.AddPolicy(PolicyName, httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = permitPerMinute,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                        }));

                options.OnRejected = async (context, cancellationToken) =>
                {
                    var retryAfterSeconds = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
                        ? (int)Math.Ceiling(retryAfter.TotalSeconds)
                        : 60;

                    context.HttpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString(CultureInfo.InvariantCulture);

                    await ResponseHandler.ResponseHandler.HandleExceptionAsync(context.HttpContext, StatusCodes.Status429TooManyRequests,
                        "تعداد تلاش‌های ورود از این شبکه در یک دقیقه‌ی اخیر بیش از حد مجاز بوده است. لطفاً کمی صبر کنید و دوباره تلاش کنید.",
                        new { RemainingSeconds = retryAfterSeconds });
                };
            });

            return services;
        }
    }
}
