using Domain.Enums;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Authorization
{
    /// <summary>The permission an endpoint's policy demands.</summary>
    public class PermissionRequirement : IAuthorizationRequirement
    {
        public PermissionRequirement(PermissionEnum permission)
        {
            Permission = permission;
        }

        public PermissionEnum Permission { get; }
    }
}
