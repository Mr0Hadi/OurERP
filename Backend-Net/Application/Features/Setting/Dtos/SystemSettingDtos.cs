using Domain.Enums;

namespace Application.Features.Setting.Dtos
{
    /// <summary>One section of the settings page.</summary>
    public class SystemSettingGroupDto
    {
        public SystemSettingGroupEnum Group { get; set; }
        public string GroupTitle { get; set; } = string.Empty;
        public List<SystemSettingDto> Settings { get; set; } = new();
    }

    public class SystemSettingDto
    {
        /// <summary>Send it back unchanged in UpdateSystemSettings.</summary>
        public string Key { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public SystemSettingTypeEnum Type { get; set; }

        /// <summary>The value in force, as invariant-culture text ("10", "true").</summary>
        public string Value { get; set; } = string.Empty;
        public string DefaultValue { get; set; } = string.Empty;

        /// <summary>True when nothing is stored, i.e. <see cref="Value"/> is the default.</summary>
        public bool IsDefault { get; set; }

        /// <summary>Limits of an INTEGER setting; null for other types.</summary>
        public long? MinValue { get; set; }
        public long? MaxValue { get; set; }

        /// <summary>Unit to print after the value, e.g. «دقیقه».</summary>
        public string? Unit { get; set; }

        /// <summary>Longest accepted text of a TEXT setting.</summary>
        public int? MaxLength { get; set; }

        /// <summary>A feature switch every signed-in user can read through GetFeatureFlags (the frontend hides menus with it).</summary>
        public bool IsPublic { get; set; }

        /// <summary>Last change; null while the setting is on its default.</summary>
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedByUserId { get; set; }
        public string? UpdatedByName { get; set; }
    }
}
