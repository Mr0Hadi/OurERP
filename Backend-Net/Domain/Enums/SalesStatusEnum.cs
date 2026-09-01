namespace Domain.Enums
{
    public enum SalesStatusEnum
    {
        // No official invoice number yet - the customer hasn't paid in full. See CLAUDE.md
        // "Purchase/Sale pre-invoice (proforma)". Numbered first, and PROCESSING/
        // PARTIALLY_DELIVERED/SHIPPED/DELIVERED/CANCELLED numbered right after it, to match the
        // frontend's SaleStatusEnum exactly (renumbered 2026-09-02; the prior append-only
        // numbering was abandoned since this is still mock data). RETURNED has no frontend
        // counterpart (the frontend doesn't produce or label it yet - see
        // docs/frontend-enum-contract.fa.md) so it's appended after the shared members instead
        // of interleaved, keeping every frontend-known value aligned.
        //
        // PENDING was removed 2026-09-01 (see docs/frontend-enum-contract.fa.md): it was a
        // backend-only pre-shipping status the frontend never produced and displayed under the
        // exact same label as PROCESSING, so nothing on the frontend distinguished them. A new
        // sale is always created as PROCESSING (once it clears PROFORMA) or PARTIALLY_DELIVERED,
        // never PENDING, so this is a pure enum cleanup with no behavior change. RETURNED shifted
        // from 7 to 6 as a result - safe because the frontend has no expectation for either value
        // and no real data was ever persisted with this enum (still mock-only, see the renumbering
        // note above).
        PROFORMA,
        PROCESSING,
        PARTIALLY_DELIVERED,
        SHIPPED,
        DELIVERED,
        CANCELLED,
        RETURNED,
    }
}
