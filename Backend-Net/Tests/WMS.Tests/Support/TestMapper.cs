using Application.Common.Mapping;
using AutoMapper;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace WMS.Tests.Support
{
    /// <summary>
    /// The real <see cref="MappingProfile"/>, resolved through the same
    /// <c>AddAutoMapper</c> DI wiring <c>ApplicationServiceRegistration</c> uses in production, so
    /// tests exercise the actual AutoMapper configuration (including its unmapped-member gaps)
    /// rather than a hand-rolled substitute.
    /// </summary>
    public static class TestMapper
    {
        private static readonly IServiceProvider Provider = BuildProvider();

        public static readonly IMapper Instance = Provider.GetRequiredService<IMapper>();
        public static readonly IConfigurationProvider Configuration = Provider.GetRequiredService<IConfigurationProvider>();

        private static IServiceProvider BuildProvider()
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());
            return services.BuildServiceProvider();
        }
    }
}
