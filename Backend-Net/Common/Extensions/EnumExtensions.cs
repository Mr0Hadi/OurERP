using System.ComponentModel;
using System.Reflection;

namespace Common.Extensions
{
    public static class EnumExtensions
    {
        public static string GetDescription(this Enum value)
        {
            // گرفتن نوع enum
            var type = value.GetType();

            // گرفتن member info مربوط به مقدار enum
            var memInfo = type.GetMember(value.ToString());
            if (memInfo != null && memInfo.Length > 0)
            {
                // گرفتن attribute از member info
                var attr = memInfo[0].GetCustomAttribute<DescriptionAttribute>();
                if (attr != null)
                {
                    return attr.Description;
                }
            }

            // اگر description پیدا نشد، مقدار enum به صورت string برگردانده می‌شود
            return value.ToString();
        }

    }
}
