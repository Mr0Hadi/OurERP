namespace Domain.Enums
{
    public enum SalesStatusEnum
    {
        // No official invoice number yet - the customer hasn't paid in full. See CLAUDE.md
        // "Purchase/Sale pre-invoice (proforma)". Numbered first, and PROCESSING/
        // PARTIALLY_DELIVERED/SHIPPED/DELIVERED/CANCELLED numbered right after it, to match the
        // frontend's SaleStatusEnum exactly (renumbered 2026-09-02; the prior append-only
        // numbering was abandoned since this is still mock data). PENDING/RETURNED have no
        // frontend counterpart (the frontend doesn't produce or label them yet - see
        // docs/frontend-enum-contract.fa.md) so they're appended after the shared members
        // instead of interleaved, keeping every frontend-known value aligned.
        PROFORMA,
        PROCESSING,
        PARTIALLY_DELIVERED,
        SHIPPED,
        DELIVERED,
        CANCELLED,
        PENDING,
        RETURNED,
    }
}
