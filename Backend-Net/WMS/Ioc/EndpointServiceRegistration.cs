using WMS.Services;

namespace WMS.Ioc
{
    public static class EndpointServiceRegistration
    {
        public static IServiceCollection AddEndPointServiceRegistration(this IServiceCollection services)
        {

            services.AddHttpContextAccessor();
            services.AddScoped<IUserContextService, UserContextService>();

            services.AddMemoryCache();

            services.AddScoped<IEnvironmentService, EnvironmentService>();


            return services;
        }
    }
}
