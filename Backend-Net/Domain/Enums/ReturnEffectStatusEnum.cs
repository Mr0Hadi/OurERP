namespace Domain.Enums
{
    /// <summary>
    /// Execution status of one effect (matches frontend EFFECT_STATUSES). Goods effects start
    /// PENDING (await a goods round); money effects start APPLIED immediately since there is
    /// nothing further to execute. VOID is for an effect cancelled before being applied - kept
    /// for audit trail rather than deleted. Nothing produces VOID yet (frontend doesn't either),
    /// but roll-ups must skip VOID effects.
    /// </summary>
    public enum ReturnEffectStatusEnum
    {
        PENDING,
        APPLIED,
        VOID,
    }
}
