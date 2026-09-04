namespace Domain.Enums
{
    /// <summary>
    /// Payment method of one money effect. Numbering is deliberately kept identical to the
    /// document-level <see cref="PaymentTypeEnum"/> (ON_ACCOUNT is that enum's CREDIT), so the
    /// frontend can use a single payment-method list on both sides of the API. STORE_CREDIT is
    /// the only member with no PaymentTypeEnum equivalent and is appended at the end.
    /// </summary>
    public enum ReturnPaymentMethodEnum
    {
        CASH = 0,
        ON_ACCOUNT = 1,
        CHECK = 2,
        TRANSFER = 3,
        MIXED = 4,
        STORE_CREDIT = 5,
    }
}
