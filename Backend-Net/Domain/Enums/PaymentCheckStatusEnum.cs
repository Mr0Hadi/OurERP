using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Where a cheque (a CHECK payment row) is in its life. Null on every other row, and on cheque rows voided before the
    /// lifecycle existed. Persisted and a frontend contract: explicit values, append only, never renumber.
    /// </summary>
    public enum PaymentCheckStatusEnum
    {
        /// <summary>Received and held by us, or issued by us and not cleared yet. In no bank balance.</summary>
        [Description("در جریان")]
        PENDING = 1,

        /// <summary>Received: deposited and cleared into our bank. Issued: cleared out of our bank. Final.</summary>
        [Description("وصول‌شده")]
        CASHED = 2,

        /// <summary>Bounced: the payment is taken back (VoidedAt is set too) and the party owes again. Final.</summary>
        [Description("برگشتی")]
        BOUNCED = 3,

        /// <summary>A received cheque passed on to a supplier as payment (خرج شده). Its fate is then followed on the new row.</summary>
        [Description("خرج‌شده")]
        ENDORSED = 4,
    }
}
