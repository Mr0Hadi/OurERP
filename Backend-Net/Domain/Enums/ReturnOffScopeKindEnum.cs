namespace Domain.Enums
{
    /// <summary>
    /// Only meaningful when ReturnClaimScopeEnum.OFF_ORDER. EXCESS is priced at the order line's
    /// unit price; UNLISTED has no order line reference at all (matches frontend OFF_SCOPE_KINDS).
    /// </summary>
    public enum ReturnOffScopeKindEnum
    {
        EXCESS,
        UNLISTED,
    }
}
