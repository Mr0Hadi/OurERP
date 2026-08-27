namespace Domain.Enums
{
    /// <summary>
    /// Payment method of one money effect (matches frontend PAYMENT_METHODS). Deliberately not
    /// the same enum as the document-level PaymentTypeEnum - ON_ACCOUNT and STORE_CREDIT have no
    /// equivalent there.
    /// </summary>
    public enum ReturnPaymentMethodEnum
    {
        CASH,
        CHECK,
        TRANSFER,
        ON_ACCOUNT,
        STORE_CREDIT,
        MIXED,
    }
}
