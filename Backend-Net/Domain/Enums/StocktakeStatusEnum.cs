using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>A stocktake session (انبارگردانی). Persisted and a frontend contract: explicit values, append only.</summary>
    public enum StocktakeStatusEnum
    {
        /// <summary>Open for scanning and counting.</summary>
        [Description("در حال شمارش")]
        COUNTING = 1,

        /// <summary>Counting is closed; the differences wait for approval. Can be reopened.</summary>
        [Description("در انتظار تأیید")]
        SUBMITTED = 2,

        /// <summary>The differences were applied to stock. Final.</summary>
        [Description("تأییدشده")]
        APPROVED = 3,

        [Description("لغوشده")]
        CANCELLED = 4,
    }
}
