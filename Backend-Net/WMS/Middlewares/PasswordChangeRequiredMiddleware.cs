using Application.Common.Contracts.Token;
using Common.Exceptions;
using Microsoft.AspNetCore.Authorization;
using WMS.Authorization;

namespace WMS.Middlewares
{
    /// <summary>
    /// After a manager resets a password, the user's token carries the MustChangePassword claim and
    /// only the actions marked <see cref="AllowWhilePasswordChangeRequiredAttribute"/> (and anonymous
    /// ones, such as RefreshToken) are answered. Enforced here rather than left to the frontend, so a
    /// manager who knows the temporary password cannot simply keep using it.
    /// </summary>
    public class PasswordChangeRequiredMiddleware
    {
        private readonly RequestDelegate _next;

        public PasswordChangeRequiredMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.User.Identity?.IsAuthenticated == true
                && context.User.HasClaim(TokenClaims.MustChangePassword, "true"))
            {
                var endpoint = context.GetEndpoint();

                var allowed = endpoint == null
                    || endpoint.Metadata.GetMetadata<IAllowAnonymous>() != null
                    || endpoint.Metadata.GetMetadata<AllowWhilePasswordChangeRequiredAttribute>() != null;

                if (!allowed)
                {
                    throw new MustChangePasswordException();
                }
            }

            await _next(context);
        }

        private sealed class MustChangePasswordException : BaseCustomException
        {
            public MustChangePasswordException()
                : base("رمز عبور شما توسط مدیر بازنشانی شده است. برای ادامه‌ی کار، ابتدا از صفحه‌ی پروفایل رمز عبور جدیدی برای خود انتخاب کنید.",
                    StatusCodes.Status403Forbidden,
                    new { MustChangePassword = true })
            {
            }
        }
    }
}
