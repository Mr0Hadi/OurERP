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

                // "Any of" guards get a policy each, found on the controllers themselves - again no
                // second list to keep in step with the attributes.
                var anyOfGuards = typeof(PermissionAuthorizationRegistration).Assembly.GetTypes()
                    .Where(type => typeof(Microsoft.AspNetCore.Mvc.ControllerBase).IsAssignableFrom(type))
                    .SelectMany(type => type.GetMethods().Cast<System.Reflection.MemberInfo>().Append(type))
                    .SelectMany(member => member.GetCustomAttributes(typeof(HasPermissionAttribute), false).Cast<HasPermissionAttribute>())
                    .Where(attribute => attribute.Permissions.Count > 1)
                    .GroupBy(attribute => attribute.Policy!);

                foreach (var guard in anyOfGuards)
                {
                    var permissions = guard.First().Permissions.ToArray();
                    options.AddPolicy(guard.Key, policy =>
                    {
                        policy.RequireAuthenticatedUser();
                        policy.AddRequirements(new PermissionRequirement(permissions));
                    });
                }
            });

            return services;
        }
    }
}
