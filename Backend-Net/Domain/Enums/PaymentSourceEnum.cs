using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Where a card-reader payment row came from. Null on every other payment (cash, check, ordinary
    /// transfer, installments). Set by the server, never by the client.
    /// </summary>
    public enum PaymentSourceEnum
    {
        /// <summary>
        /// The device's own result, verified by the server. Nothing can produce it yet: it needs the
        /// signed device result of frontend-requests 12.1, which waits for the devices to be installed.
        /// </summary>
        [Description("از دستگاه")]
        DEVICE = 1,

        /// <summary>Typed in from the printed receipt. Needs the PosManualRecord permission.</summary>
        [Description("ثبت دستی از روی رسید")]
        MANUAL_RECEIPT = 2,
    }
}
