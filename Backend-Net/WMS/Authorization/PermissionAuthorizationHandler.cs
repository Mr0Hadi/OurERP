using Application.Common.Contracts.Permissions;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Authorization
{
    /// <summary>
    /// Answers every <see cref="PermissionRequirement"/> by asking the database (through
    /// <see cref="IPermissionService"/>'s cache) what the signed-in user currently holds - not by
    /// reading claims out of the JWT. That is what makes a revoked permission take effect on the
    /// user's next request rather than whenever their token expires.
    ///
    /// Scoped, not singleton, because IPermissionService resolves a scoped DbContext.
    /// </summary>
    public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
    {
        private readonly IPermissionService _permissionService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        // AuthorizationHandlerContext carries no CancellationToken, so the request's own token is
        // fetched from the HttpContext rather than letting the parameter default (section 7's
        // "don't drop the CancellationToken").
        public PermissionAuthorizationHandler(IPermissionService permissionService, IHttpContextAccessor httpContextAccessor)
        {
            _permissionService = permissionService;
            _httpContextAccessor = httpContextAccessor;
        }

        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
        {
            var rawUserId = context.User.FindFirst("Id")?.Value;

            // Fail closed: no identity, or an id that is not a number, grants nothing. Calling
            // neither Succeed nor Fail would also deny, but saying so explicitly stops another
            // handler for the same requirement from being able to let it through later.
            if (!int.TryParse(rawUserId, out var userId) || userId <= 0)
            {
                context.Fail();
                return;
            }

            var cancellationToken = _httpContextAccessor.HttpContext?.RequestAborted ?? CancellationToken.None;

            if (await _permissionService.HasPermissionAsync(userId, requirement.Permission, cancellationToken))
                context.Succeed(requirement);
            else
                context.Fail();
        }
    }
}
