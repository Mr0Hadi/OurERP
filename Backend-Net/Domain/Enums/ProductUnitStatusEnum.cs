namespace Domain.Enums
{
    // SHIPPED=5/DAMAGED=6/LOST=7/RETURNED_BY_CUSTOMER=8 were added 2026-08-28 at the frontend's
    // request for a "manual status entry" warehouse feature that was never designed, and were
    // never produced anywhere (ProductUnitService - the only thing that mints/consumes/
    // restores/reconciles units - never wrote them; no seed script sets them either). The
    // frontend backed the request out the same week and is back to these same 4 members (see
    // docs/frontend-enum-contract.fa.md section 2). Removed 2026-09-01 for full frontend parity;
    // if a future feature needs them, docs/frontend-enum-contract.fa.md section 2 has the
    // previously-agreed numbers to reuse.
    public enum ProductUnitStatusEnum
    {
        IN_STOCK = 1,
        SOLD = 2,
        RETURNED_TO_SUPPLIER = 3,
        SCRAPPED = 4,
    }
}
