using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace WMS.Authorization
{
    /// <summary>
    /// Makes a 401/403 look like every other error this API returns.
    ///
    /// ASP.NET's own challenge/forbid writes an empty body, and it never throws, so
    /// <c>ExceptionHandlingMiddleware</c> never sees it - a frontend that reads
    /// <c>response.message</c> would get nothing at all on the one response it most needs to
    /// explain. This writes the project's <c>ResponseDto.Danger(...)</c> shape instead.
    /// </summary>
    public class PermissionAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
    {
        private readonly AuthorizationMiddlewareResultHandler _default = new();

        public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy,
            PolicyAuthorizationResult authorizeResult)
        {
            if (authorizeResult.Challenged)
            {
                await ResponseHandler.ResponseHandler.HandleExceptionAsync(
                    context, StatusCodes.Status401Unauthorized, "برای انجام این عملیات باید وارد سامانه شوید.", null);
                return;
            }

            if (authorizeResult.Forbidden)
            {
                await ResponseHandler.ResponseHandler.HandleExceptionAsync(
                    context, StatusCodes.Status403Forbidden, "شما دسترسی لازم برای انجام این عملیات را ندارید.", null);
                return;
            }

            await _default.HandleAsync(next, context, policy, authorizeResult);
        }
    }
}
