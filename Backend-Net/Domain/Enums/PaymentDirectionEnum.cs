using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Which way money moved, seen from us. Absolute, not relative to the document: a sale payment and a
    /// supplier refund are both IN, a purchase payment and a customer refund are both OUT. The document's
    /// natural direction (sale IN, purchase OUT) is what "paid" means on it; see DocumentPayments.
    /// Starts at 1 so an unset value (0) is caught instead of silently meaning one of the two.
    /// </summary>
    public enum PaymentDirectionEnum
    {
        [Description("دریافت")]
        IN = 1,
        [Description("پرداخت")]
        OUT = 2,
    }
}
