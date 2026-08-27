namespace Domain.Enums
{
    /// <summary>
    /// The four base movements a return resolution can be composed of. Directions are relative to
    /// our company (matches frontend EFFECT_KINDS) - the same enum drives both purchase and sale
    /// returns: on a sale return GOODS_IN is "customer sends goods back", on a purchase return
    /// GOODS_IN is "supplier sends a replacement" - same shape, different counterparty.
    /// </summary>
    public enum ReturnEffectKindEnum
    {
        GOODS_IN,
        GOODS_OUT,
        MONEY_OUT,
        MONEY_IN,
    }
}
