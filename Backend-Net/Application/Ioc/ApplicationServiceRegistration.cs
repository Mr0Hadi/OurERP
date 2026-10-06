using Application.Common.Behaviors;
using Application.Common.DataTransfer;
using Application.Features.DataTransfer;
using Application.Common.Mapping;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace Application.Ioc
{
    public static class ApplicationServiceRegistration
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {

            services.AddMediatR(cfg =>
            {
                cfg.RegisterServicesFromAssembly(typeof(ApplicationServiceRegistration).Assembly);
            });

            services.AddValidatorsFromAssembly(typeof(ApplicationServiceRegistration).Assembly);

            services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

            services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

            // Import/export: every IDataTransferDefinition in this assembly is a resource, picked up here so a feature
            // only has to write its definition class. Scoped, because definitions query the scoped DbContext.
            foreach (var definition in typeof(ApplicationServiceRegistration).Assembly.GetTypes()
                         .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(IDataTransferDefinition).IsAssignableFrom(t)))
                services.AddScoped(typeof(IDataTransferDefinition), definition);

            services.AddScoped<IDataTransferRegistry, DataTransferRegistry>();
            services.AddScoped<ImportRunner>();
            services.AddScoped<DataTransferAccess>();

            return services;
        }
    }
}
