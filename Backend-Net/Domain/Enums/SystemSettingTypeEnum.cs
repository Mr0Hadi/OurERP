using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>How a setting's value is written and checked. Sent on the wire as an int: append only, never renumber.</summary>
    public enum SystemSettingTypeEnum
    {
        [Description("عدد صحیح")]
        INTEGER = 1,

        [Description("بله/خیر")]
        BOOLEAN = 2,

        [Description("متن")]
        TEXT = 3,
    }
}
