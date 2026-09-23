using Common.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using WMS.Authorization;

namespace WMS.Ioc
{
    public static class PermissionAuthorizationRegistration
    {
        /// <summary>
        /// Registers one policy per <c>PermissionEnum</c> member, named after the member, plus the
        /// handler that answers them. Generated from the enum rather than written out by hand so a
        /// new permission is guardable the moment it is declared - there is no second list to
        /// remember to update.
        /// </summary>
        public static IServiceCollection AddPermissionAuthorization(this IServiceCollection services)
        {
            // Scoped: the handler resolves IPermissionService, which resolves the scoped DbContext.
            services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
            services.AddSingleton<IAuthorizationMiddlewareResultHandler, PermissionAuthorizationResultHandler>();

            services.AddAuthorization(options =>
            {
                foreach (var permission in PermissionExtensions.All)
                {
                    options.AddPolicy(HasPermissionAttribute.PolicyNameOf(permission), policy =>
                    {
                        policy.RequireAuthenticatedUser();
                        policy.AddRequirements(new PermissionRequirement(permission));
                    });
                }
            });

            return services;
        }
    }
}
