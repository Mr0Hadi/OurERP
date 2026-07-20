using System.Security.Claims;
using System.Security.Principal;

namespace Common.Extensions
{
    public static class IdentityExtensions
    {
        public static string GetUserId(this IIdentity identity)
        {
            return identity?.GetUserClaimValue("Id");
        }

        public static string GetUserClaimValue(this IIdentity identity, string claimType)
        {
            var identity1 = identity as ClaimsIdentity;
            return identity1?.FindFirstValue(claimType);
        }

        public static string FindFirstValue(this ClaimsIdentity identity, string claimType)
        {
            return identity?.FindFirst(claimType)?.Value;
        }

        public static string GetUserCliam(this ClaimsPrincipal User, string claimName)
        {
            var claimIdentity = User.Identity as ClaimsIdentity;

            return claimIdentity.FindFirst(claimName)?.Value;
        }

        public static int ToInt(this string value)
        {
            return Convert.ToInt32(value);
        }
    }
}
