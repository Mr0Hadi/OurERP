using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>Display sections of the settings page. Sent on the wire as an int: append only, never renumber.</summary>
    public enum SystemSettingGroupEnum
    {
        [Description("فروش")]
        SALE = 1,

        [Description("دریافت و پرداخت")]
        PAYMENT = 2,

        [Description("اقساط")]
        INSTALLMENT = 3,
    }
}
