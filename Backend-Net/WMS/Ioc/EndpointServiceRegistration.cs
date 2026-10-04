using Application.Common.Contracts.Environment;
using Application.Common.Contracts.UserContextService;
using Microsoft.Extensions.Caching.Memory;
using WMS.Idempotency;
using WMS.Logging;
using WMS.Services;

namespace WMS.Ioc
{
    public static class EndpointServiceRegistration
    {
        public static IServiceCollection AddEndPointServiceRegistration(this IServiceCollection services, IConfiguration configuration)
        {

            services.AddHttpContextAccessor();
            services.AddScoped<IUserContextService, UserContextService>();

            services.AddMemoryCache();
            // Its own size-limited cache, not the shared one: stored responses are the only thing in
            // this process a signed-in user can make grow at will (one per new key), so they get a
            // fixed budget and the oldest are evicted when it is spent.
            services.AddSingleton(_ => new IdempotencyStore(new MemoryCache(new MemoryCacheOptions
            {
                SizeLimit = IdempotencyStore.MaxTotalBytes,
            })));

            services.AddSingleton(new LogRedactor(configuration["LogRedaction:HashKey"]));

            services.AddScoped<IEnvironmentService, EnvironmentService>();


            return services;
        }
    }
}
