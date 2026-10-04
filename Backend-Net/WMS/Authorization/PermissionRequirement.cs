using Domain.Enums;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Authorization
{
    /// <summary>The permissions an endpoint's policy accepts - holding any one of them is enough.</summary>
    public class PermissionRequirement : IAuthorizationRequirement
    {
        public PermissionRequirement(params PermissionEnum[] permissions)
        {
            Permissions = permissions;
        }

        public IReadOnlyList<PermissionEnum> Permissions { get; }
    }
}
