using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Where a PROFORMA sale is in its approval pipeline (docs/proforma-approval-pipeline.md). Only meaningful while
    /// Sale.Status == PROFORMA; the whole proforma stays editable at every stage, and an edit that changes what was approved
    /// sends it back to DRAFT. WAREHOUSE_CHECKED means every unit is scanned and reserved: the customer may now pay, and the
    /// first payment issues the invoice. Persisted as an int and a frontend contract: never renumber.
    /// </summary>
    public enum SaleProformaStageEnum
    {
        [Description("پیش‌نویس")]
        DRAFT = 0,

        [Description("تأیید مشتری")]
        CUSTOMER_APPROVED = 1,

        [Description("تأیید انبار - آماده‌ی پرداخت")]
        WAREHOUSE_CHECKED = 2,
    }
}
