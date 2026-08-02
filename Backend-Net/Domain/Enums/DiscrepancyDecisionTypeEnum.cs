using System.ComponentModel;

namespace Domain.Enums
{
    public enum DiscrepancyDecisionTypeEnum
    {
        [Description("برگشت به تامین‌کننده")]
        RETURN_TO_SUPPLIER,
        [Description("نگهداری و پرداخت")]
        KEEP_AND_PAY,
        [Description("استرداد وجه")]
        CASH_REFUND,
        [Description("جایگزینی کالا")]
        REPLACEMENT,
        [Description("اعتبار خرید")]
        CREDIT_NOTE,
        [Description("رد توسط تامین‌کننده")]
        SUPPLIER_REJECTED,
    }
}
