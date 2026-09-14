namespace Domain.Enums
{
    /// <summary>
    /// Only meaningful when ReturnClaimScopeEnum.OFF_ORDER (matches frontend OFF_SCOPE_KINDS).
    /// EXCESS is "more of a product the document does list": it must reference that order line
    /// (orderLineId required, product must match the line) and is priced at the order line's unit
    /// price - the server copies the line's UnitPrice, the client's value is not used.
    /// UNLISTED is "a product the document does not list at all": it has no order line reference
    /// (sending orderLineId is a 400) and keeps the client-supplied UnitPrice.
    ///
    /// Neither kind consumes or settles the line's quota or scopes ProductUnits to the line - those key
    /// on Scope == ON_ORDER (see *ReturnClaim.OnOrder*ItemId). What the goods effects of either kind do to
    /// stock, cost and money is the same as for any other claim.
    /// </summary>
    public enum ReturnOffScopeKindEnum
    {
        EXCESS,
        UNLISTED,
    }
}
