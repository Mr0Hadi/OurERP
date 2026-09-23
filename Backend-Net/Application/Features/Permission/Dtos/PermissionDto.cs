using Domain.Enums;

namespace Application.Features.Permission.Dtos
{
    /// <summary>One entry of the permission catalogue.</summary>
    public class PermissionDto
    {
        public PermissionEnum Permission { get; set; }

        /// <summary>The enum member name - the stable key a frontend guards its UI on.</summary>
        public string Name { get; set; } = null!;

        /// <summary>Persian label, from the member's [Description].</summary>
        public string Title { get; set; } = null!;
    }

    /// <summary>A catalogue section, as the permission screen renders it.</summary>
    public class PermissionGroupDto
    {
        public PermissionGroupEnum Group { get; set; }
        public string GroupTitle { get; set; } = null!;
        public List<PermissionDto> Permissions { get; set; } = new();
    }

    /// <summary>A permission a specific user holds, with how it got there.</summary>
    public class UserPermissionDto : PermissionDto
    {
        public DateTime GrantedAt { get; set; }
        public string? GrantedByFullName { get; set; }
    }
}
