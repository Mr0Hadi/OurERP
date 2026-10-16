using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>Why a manual warehouse action was taken - recorded on the unit's movement row. Numbers are a frontend contract.</summary>
    public enum UnitActionReasonEnum
    {
        [Description("آسیب در انبار")]
        DAMAGED_IN_WAREHOUSE = 1,

        [Description("عیبِ کشف‌شده")]
        DEFECT_FOUND = 2,

        [Description("تاریخ گذشته")]
        EXPIRED = 3,

        [Description("نیاز به بررسی")]
        NEEDS_INSPECTION = 4,

        [Description("بررسی شد - سالم")]
        INSPECTION_PASSED = 5,

        /// <summary>The system holds it IN_STOCK but it is not on the shelf (lost, stolen). Reported during a proforma check.</summary>
        [Description("مفقود")]
        MISSING = 6,

        [Description("سایر موارد")]
        OTHER = 9,
    }
}
