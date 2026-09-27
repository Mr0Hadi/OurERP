using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Payment method of one money effect. Numbering is deliberately kept identical to the
    /// document-level <see cref="PaymentTypeEnum"/> (ON_ACCOUNT is that enum's CREDIT), so the
    /// frontend can use a single payment-method list on both sides of the API.
    /// STORE_CREDIT = 5 was removed on 2026-09-24 (store credit is not a feature of this system);
    /// migration remove-store-credit moved its persisted rows to ON_ACCOUNT. Do not reuse 5.
    /// </summary>
    public enum ReturnPaymentMethodEnum
    {
        [Description("نقدی")]
        CASH = 0,
        [Description("به حساب")]
        ON_ACCOUNT = 1,
        [Description("چک")]
        CHECK = 2,
        [Description("انتقال بانکی")]
        TRANSFER = 3,
        [Description("ترکیبی")]
        MIXED = 4,
    }
}
