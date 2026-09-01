namespace Domain.Enums
{
    public enum PurchaseStatusEnum
    {
        // No official supplier invoice yet - see CLAUDE.md "Purchase/Sale pre-invoice
        // (proforma)". Numbered first to match the frontend's PurchaseStatusEnum exactly
        // (renumbered 2026-09-02; the prior append-only numbering was abandoned since this is
        // still mock data - no real persisted rows depend on the old integers).
        PROFORMA,
        PENDING,
        SHIPPED,
        PARTIALLY_RECEIVED,
        RECEIVED,
        CANCELLED,
    }
}
