using System.ComponentModel;

namespace Domain.Enums
{
    public enum DiscrepancyStatusEnum
    {
        [Description("بدون تصمیم")]
        UNDECIDED,
        [Description("تصمیم جزئی")]
        PARTIAL,
        [Description("تصمیم گرفته شده")]
        DECIDED,
    }
}
