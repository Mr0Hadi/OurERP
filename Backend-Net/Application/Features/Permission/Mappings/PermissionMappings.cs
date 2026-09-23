using Application.Features.Permission.Dtos;
using Common.Extensions;
using Domain.Enums;

namespace Application.Features.Permission.Mappings
{
    /// <summary>
    /// Hand-built, not AutoMapper: a permission DTO is projected from an enum member's metadata,
    /// not from an entity, so there is no source type for a profile to map from.
    /// </summary>
    public static class PermissionMappings
    {
        public static PermissionDto ToDto(this PermissionEnum permission)
        {
            return new PermissionDto
            {
                Permission = permission,
                Name = permission.ToString(),
                Title = permission.GetDescription()
            };
        }

        /// <summary>Groups a flat set into the sections the permission screen renders.</summary>
        public static List<PermissionGroupDto> ToGroupedDtos(this IEnumerable<PermissionEnum> permissions)
        {
            return permissions
                .GroupBy(permission => permission.GetGroup())
                .OrderBy(group => group.Key)
                .Select(group => new PermissionGroupDto
                {
                    Group = group.Key,
                    GroupTitle = group.Key.GetDescription(),
                    Permissions = group.Select(permission => permission.ToDto()).ToList()
                })
                .ToList();
        }
    }
}
