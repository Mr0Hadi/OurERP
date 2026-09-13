using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Lifecycle of a PurchaseReturn/SaleReturn. OPEN/IN_PROGRESS/SETTLED are computed from the
    /// claim graph (I*ReturnCalculationService.RecomputeReturnStatus); REJECTED/CANCELLED are only
    /// ever set by their explicit commands. Which lifecycle command is legal in which status is
    /// defined once, in I*ReturnCalculationService.GetLifecycleBlocker.
    /// The descriptions match the frontend's status labels and are used in refusal messages.
    /// </summary>
    public enum ReturnStatusEnum
    {
        [Description("در انتظار تصمیم")]
        OPEN = 0,

        [Description("در حال اجرا")]
        IN_PROGRESS = 1,

        [Description("تسویه شده")]
        SETTLED = 2,

        [Description("رد شده")]
        REJECTED = 3,

        [Description("لغو شده")]
        CANCELLED = 4
    }
}
