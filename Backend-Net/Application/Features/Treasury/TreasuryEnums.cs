using System.ComponentModel;

namespace Application.Features.Treasury
{
    /// <summary>What a statement line is. Read-side only (never persisted), but sent on the wire: append only.</summary>
    public enum BankAccountMovementKindEnum
    {
        [Description("دریافت/پرداخت")]
        PAYMENT = 1,

        [Description("انتقال به این حساب")]
        TRANSFER_IN = 2,

        [Description("انتقال از این حساب")]
        TRANSFER_OUT = 3,
    }
}
