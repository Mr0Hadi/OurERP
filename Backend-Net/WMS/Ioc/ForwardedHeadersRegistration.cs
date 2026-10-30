using Microsoft.AspNetCore.HttpOverrides;

namespace WMS.Ioc
{
    /// <summary>
    /// Behind Cloudflare every request reaches IIS from a Cloudflare edge address, so the login rate limit was one shared
    /// window for everybody and the request log recorded Cloudflare instead of the user (frontend-requests 20.3). The client
    /// address is taken from X-Forwarded-For only when the request itself came from one of the networks listed in
    /// <c>ForwardedHeaders:KnownNetworks</c> (Cloudflare's published ranges, https://www.cloudflare.com/ips/) - from anyone
    /// else the header is ignored, since any client can send one. An empty list (development) turns this off.
    /// Keep the list in step with Cloudflare's: a range they add and we lack gives those users the shared limit again.
    /// </summary>
    public static class ForwardedHeadersRegistration
    {
        public const string SectionName = "ForwardedHeaders:KnownNetworks";

        public static IServiceCollection AddTrustedForwardedHeaders(this IServiceCollection services, IConfiguration configuration)
        {
            var networks = configuration.GetSection(SectionName).Get<string[]>() ?? Array.Empty<string>();

            services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor;
                // One hop: Cloudflare appends the address it received the request from.
                options.ForwardLimit = 1;
                foreach (var network in networks)
                    options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
            });

            return services;
        }

        public static bool IsEnabled(IConfiguration configuration) =>
            (configuration.GetSection(SectionName).Get<string[]>() ?? Array.Empty<string>()).Length > 0;
    }
}
