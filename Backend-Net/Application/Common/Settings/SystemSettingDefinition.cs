using System.Globalization;
using Domain.Enums;

namespace Application.Common.Settings
{
    /// <summary>
    /// One entry of the settings catalogue: what the value means, how it is written and the limits it must stay within.
    /// Values are stored and sent as invariant-culture text ("10", "true"); <see cref="Normalize"/> is the one parser.
    /// <see cref="IsPublic"/> = readable by every signed-in user through GetFeatureFlags (feature switches the frontend needs to
    /// hide or show menus); everything else needs SettingView. See CLAUDE.md section 6b for what a switch may and may not do.
    /// </summary>
    public sealed record SystemSettingDefinition(
        string Key,
        SystemSettingGroupEnum Group,
        SystemSettingTypeEnum Type,
        string DefaultValue,
        string Title,
        string Description,
        long? MinValue = null,
        long? MaxValue = null,
        string? Unit = null,
        int MaxLength = 1000,
        bool IsPublic = false)
    {
        /// <summary>
        /// The canonical text of <paramref name="value"/>, or null with <paramref name="error"/> set when it is not a valid value
        /// of this setting. Surrounding whitespace is ignored.
        /// </summary>
        public string? Normalize(string value, out string? error)
        {
            error = null;
            var text = value.Trim();

            switch (Type)
            {
                case SystemSettingTypeEnum.INTEGER:
                    if (!long.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number))
                    {
                        error = $"مقدار «{Title}» باید عدد صحیح باشد.";
                        return null;
                    }
                    if (MinValue.HasValue && number < MinValue.Value || MaxValue.HasValue && number > MaxValue.Value)
                    {
                        error = $"مقدار «{Title}» باید بین {MinValue} و {MaxValue}{(Unit == null ? string.Empty : " " + Unit)} باشد.";
                        return null;
                    }
                    return number.ToString(CultureInfo.InvariantCulture);

                case SystemSettingTypeEnum.BOOLEAN:
                    if (!bool.TryParse(text, out var flag))
                    {
                        error = $"مقدار «{Title}» باید true یا false باشد.";
                        return null;
                    }
                    return flag ? "true" : "false";

                default:
                    if (text.Length > MaxLength)
                    {
                        error = $"مقدار «{Title}» حداکثر {MaxLength} نویسه است.";
                        return null;
                    }
                    return text;
            }
        }
    }
}
