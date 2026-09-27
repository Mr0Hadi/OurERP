using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Unified 14-member problem space replacing PurchaseIssueTypeEnum, SalesReturnReasonEnum and
    /// SalesReturnIssueTypeEnum (matches frontend RETURN_PROBLEMS exactly - same numeric values).
    /// Per-side allowed subsets (which members a purchase claim, a sale claim, or a warehouse
    /// inspection observation may use) are enforced in validators, not by splitting the enum -
    /// mirrors PURCHASE_CLAIM_PROBLEMS / SALES_CLAIM_PROBLEMS / OBSERVED_PROBLEMS on the frontend.
    /// </summary>
    public enum ReturnProblemEnum
    {
        [Description("ارسال کالای اشتباه")]
        WRONG_ITEM_SHIPPED,
        [Description("کالا در فاکتور اشتباه ثبت شد")]
        WRONG_ITEM_INVOICED,
        [Description("کالا اشتباه سفارش داده شد")]
        WRONG_ITEM_ORDERED,
        [Description("کسری تحویل")]
        SHORT_SHIPPED,
        [Description("بیشتر از سند ارسال شد")]
        OVER_SHIPPED,
        [Description("تعداد در فاکتور اشتباه ثبت شد")]
        WRONG_QTY_INVOICED,
        [Description("تعداد اشتباه سفارش داده شد")]
        WRONG_QTY_ORDERED,
        [Description("کالای معیوب / خراب")]
        DEFECTIVE,
        [Description("آسیب‌دیده در حمل")]
        DAMAGED_IN_TRANSIT,
        [Description("مغایرت کیفیت / مشخصات")]
        QUALITY_ISSUE,
        [Description("تاریخ گذشته")]
        EXPIRED,
        [Description("انصراف / پشیمانی")]
        CHANGED_MIND,
        [Description("کالای خارج از سند")]
        UNLISTED_ITEM,
        [Description("سایر موارد")]
        OTHER,
    }
}
