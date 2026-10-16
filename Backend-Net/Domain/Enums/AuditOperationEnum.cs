using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>What happened to the row an AuditEntityChange records. Persisted - never renumber.</summary>
    public enum AuditOperationEnum
    {
        [Description("ایجاد")]
        INSERT = 1,

        [Description("ویرایش")]
        UPDATE = 2,

        [Description("حذف")]
        DELETE = 3,
    }
}
