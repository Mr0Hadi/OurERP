using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using WMS.Authorization;

namespace WMS.Tests.Unit
{
    /// <summary>
    /// Permissions are enforced at the HTTP boundary, on the action - not in a MediatR pipeline
    /// behaviour, because composite commands (CreateInPersonSale, ReceiveShipment) send other
    /// commands through IMediator and a behaviour would demand the inner commands' permissions
    /// from a user who only asked for the outer one.
    ///
    /// The cost of that choice is that nothing makes a new endpoint remember its guard. This test
    /// is the thing that makes it remember: every action must either carry [HasPermission] or be
    /// named below with the reason it needs none.
    /// </summary>
    public class EndpointPermissionCoverageTests
    {
        /// <summary>Reachable without a token at all.</summary>
        private static readonly HashSet<string> Anonymous = new()
        {
            "AccountController.Login",              // there is no identity yet
            "AccountController.RefreshToken",       // authenticated by the refresh token itself
            "AccountController.ForgetPassword",     // by definition cannot require a session
            "FileController.GetImage",              // an <img src> cannot send a bearer token
        };

        /// <summary>Authenticated, but open to every user - nothing to grant.</summary>
        private static readonly HashSet<string> AuthenticatedOnly = new()
        {
            "AccountController.Logout",                 // ending your own session
            "FileController.GetImageUrl",               // re-signs a key the caller already has
            "PermissionController.GetMyPermissions",    // asking what you yourself may do
            "UserController.GetUserInfo",               // your own profile
            "UserController.UpdateUserInfo",            // your own name
            "UserController.ChangePassword",            // your own password
        };

        private static List<(Type Controller, MethodInfo Action, string Key)> AllActions()
        {
            return typeof(WMS.Controllers.PermissionController).Assembly
                .GetTypes()
                .Where(type => typeof(ControllerBase).IsAssignableFrom(type) && !type.IsAbstract)
                .SelectMany(controller => controller
                    .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                    .Where(method => method.GetCustomAttributes<HttpMethodAttribute>().Any())
                    .Select(method => (controller, method, $"{controller.Name}.{method.Name}")))
                .ToList();
        }

        [Fact]
        public void EveryEndpoint_IsGuarded()
        {
            var problems = new List<string>();

            foreach (var (controller, action, key) in AllActions())
            {
                var isAnonymous = action.GetCustomAttribute<AllowAnonymousAttribute>() != null
                                  || controller.GetCustomAttribute<AllowAnonymousAttribute>() != null;

                if (isAnonymous)
                {
                    if (!Anonymous.Contains(key))
                        problems.Add($"{key} is [AllowAnonymous] - guard it, or add it to the Anonymous list with a reason.");
                    continue;
                }

                var hasPermission = action.GetCustomAttribute<HasPermissionAttribute>() != null
                                    || controller.GetCustomAttribute<HasPermissionAttribute>() != null;

                if (hasPermission) continue;

                if (!AuthenticatedOnly.Contains(key))
                {
                    problems.Add($"{key} has no [HasPermission] - guard it, or add it to the AuthenticatedOnly list with a reason.");
                    continue;
                }

                // Even the unguarded ones must still need a token.
                var requiresAuth = action.GetCustomAttribute<AuthorizeAttribute>() != null
                                   || controller.GetCustomAttribute<AuthorizeAttribute>() != null;

                if (!requiresAuth)
                    problems.Add($"{key} requires neither authentication nor a permission.");
            }

            Assert.Empty(problems);
        }

        /// <summary>
        /// Every [HasPermission] must name a defined member - a guard pointing at a permission
        /// that no longer exists would have no policy registered for it at startup.
        /// </summary>
        [Fact]
        public void EveryGuard_NamesADefinedPermission()
        {
            foreach (var (_, action, key) in AllActions())
            foreach (var attribute in action.GetCustomAttributes<HasPermissionAttribute>())
                Assert.True(Enum.IsDefined(attribute.Permission), key);
        }

        /// <summary>
        /// Nothing should be listed as an exception that has since been guarded, or that no longer
        /// exists - a stale entry is a hole nobody is looking at any more.
        /// </summary>
        [Fact]
        public void TheExceptionLists_AreNotStale()
        {
            var keys = AllActions().Select(x => x.Key).ToHashSet();

            Assert.Empty(Anonymous.Where(key => !keys.Contains(key)));
            Assert.Empty(AuthenticatedOnly.Where(key => !keys.Contains(key)));
        }
    }
}
