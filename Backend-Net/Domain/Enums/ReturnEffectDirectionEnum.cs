namespace Domain.Enums
{
    /// <summary>
    /// The base movements a return resolution can be composed of. Directions are relative to
    /// our company (matches frontend EFFECT_KINDS) - the same enum drives both purchase and sale
    /// returns: on a sale return GOODS_IN is "customer sends goods back", on a purchase return
    /// GOODS_IN is "supplier sends a replacement" - same shape, different counterparty.
    ///
    /// Persisted as an int: values are explicit, members are appended and never renumbered.
    /// </summary>
    public enum ReturnEffectDirectionEnum
    {
        GOODS_IN = 0,
        GOODS_OUT = 1,
        MONEY_OUT = 2,
        MONEY_IN = 3,

        /// <summary>Purchase returns only: quarantined units become sellable stock. Internal - no counterparty.</summary>
        GOODS_RELEASE = 4,

        /// <summary>Purchase returns only: quarantined units are scrapped - a reported loss at the effect's unit cost.</summary>
        GOODS_SCRAP = 5,
    }
}
