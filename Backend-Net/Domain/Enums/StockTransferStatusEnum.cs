using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>A stock transfer between warehouses. Persisted and a frontend contract: explicit values, append only.</summary>
    public enum StockTransferStatusEnum
    {
        /// <summary>Dispatched: its units are IN_TRANSIT, in no warehouse's sellable stock.</summary>
        [Description("در راه")]
        IN_TRANSIT = 1,

        [Description("تحویل‌شده")]
        RECEIVED = 2,

        /// <summary>Called back before arriving: the units are back on the source warehouse's shelf.</summary>
        [Description("لغوشده")]
        CANCELLED = 3,
    }
}
