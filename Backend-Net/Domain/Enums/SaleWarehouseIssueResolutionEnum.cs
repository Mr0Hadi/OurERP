using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>How accounting settled a unit the warehouse reported during a proforma check. Frontend contract: never renumber.</summary>
    public enum SaleWarehouseIssueResolutionEnum
    {
        /// <summary>Found, or not really damaged: back on the shelf at the value it was held at.</summary>
        [Description("بازگشت به موجودی")]
        RELEASE = 1,

        /// <summary>Gone for good: the held value is booked as a loss.</summary>
        [Description("اسقاط و ثبت زیان")]
        SCRAP = 2,

        /// <summary>The supplier's fault: the unit stays in quarantine for a purchase return on its line.</summary>
        [Description("نگهداری برای مرجوعی به تامین‌کننده")]
        SUPPLIER_RETURN = 3,
    }
}
