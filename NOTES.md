# Notes

Findings worth acting on later. Add new items at the top of "Open".

## Open

### Purchase surplus (excess / unregistered items) — follow-ups (Aug 2026)

Left open after the surplus feature (`feat/purchase-surplus-handling`).
The feature itself is complete and verified end to end — receiving
capture, claim, all three resolutions, and dispatch to the supplier.
These are deliberate omissions and things the work exposed, not defects.

**1. The purchase detail page ignores `totalAmount`.** It recomputes
totals from line items, so a stored `totalAmount` that has been adjusted
never shows there — the purchases *list* shows one number and the detail
page another. This predates surplus (`settlePurchaseItems` has always
subtracted refunds from `totalAmount`), but surplus made it visible in
the other direction too: after a keep-and-settle, `PurchaseDetailForm`
showed ۲۸٬۵۷۵٬۰۰۰ while the list showed ۳۰٬۵۰۰٬۰۰۰ for the same
purchase. Whoever fixes this has to decide which is the source of truth:
either the detail page reads `totalAmount`, or `totalAmount` is derived
and the adjustments become explicit adjustment lines on the purchase.
The second is more work but is what an invoice with credit/debit notes
actually looks like.

**2. `invalidateSalesEcosystem` still does not invalidate products.**
The purchase side was fixed as part of this work
(`invalidatePurchaseEcosystem` now includes `productKeys.all`, since
both receiving and keep-decisions move stock). The sales side moves
stock too — replacement shipments in `confirmReplacementShipmentBatch`
and return inspection in `confirmReturnInspection` — and still leaves
the products cache stale. Same one-line fix, deliberately not made here
because nothing on this branch touches sales.

**3. `refundAmount` on a resolution line carries two directions.** On a
`refund` it is money coming back to us; on `keep_and_settle` it is money
we owe the supplier. The field was not renamed because
`AddResolutionForm` is shared with sales returns and the rename would
ripple across a module this branch has no business touching. The
sidebar reports the two separately so they are never summed. If the two
return modules are ever unified, rename it to `amount` there.

**4. Quick-created products are minimal.** The product-link dialog can
create a product from an unregistered surplus item, but only fills
name, category, unit, purchase price, and auto-generated code/barcode;
brand, sale prices, tax, low-stock threshold and image are left empty
and must be completed from the products page. That is a deliberate
trade — the person resolving a purchase return should not be forced
through the full product form — but there is no reminder anywhere that
the record is incomplete. A "needs completion" flag on products, or a
filter for them, would close the loop.

**5. Unregistered items do not dedupe.** Two receiving rounds that each
log "کارتن فیلتر بدون برچسب" produce two independent surplus rows and
two independent claims, even after both are linked to the same product.
This follows from keeping each warehouse row its own claim (the note and
date of a round are part of what the row means), and it is the accepted
cost of not forcing product creation at the dock. If it becomes a
nuisance, the place to fix it is the claim form — offer to merge rows
that were linked to the same product, not the capture step.

**6. Kept surplus does not generate unit labels.** A keep decision
raises `stock` directly, the same way receiving does, so kept goods have
no unit records and no barcodes until someone visits
`/warehouse/unit-labels`. Consistent with how receiving behaves today
(see item 3 of the unit-barcode notes below), and it should be solved
in the same pass rather than separately.

**7. No cross-check between received and excess quantities.** The
receiving form takes "received against the order" and "excess beyond the
order" as two independent numbers; nothing verifies their sum against a
physical count, because the form never asks for one. A worker who means
"25 arrived, 20 ordered" has to type 20 and 5 themselves. If receiving
ever gains a total-count field, that check becomes possible and worth
adding.

### Unit-level barcodes — consolidated follow-ups (Aug 2026)

Everything still open from the unit-barcode effort, in rough priority order.
The feature itself is complete and verified; these are deliberate omissions,
not defects.

**1. Audit trail: who did it, not just that it happened.** Units record
`firstPrintedAt` / `lastPrintedAt` / `printCount` / `statusChangedAt`, but
never *which user*. Every WMS reference treats operator attribution as
table stakes for label printing and manual stock corrections. The plumbing
exists — `features/auth/store/authStore.js` and `useCurrentUser()` — but is
dormant: `protectedLoader` is commented out in `app/routes/routers.jsx`, no
user is ever set, and the sidebar user is a hardcoded constant in
`navigationData.js`. So attribution would record `null` today. **Do this
when auth is actually wired up**, not before. Two sizes: stamping
`printedBy` / `statusChangedBy` on the unit (small, ~30 lines), or a proper
append-only event log per unit (created / printed / reprinted / allocated /
shipped / status-corrected), which is what Odoo-style traceability reports
are built on (bigger, own task).

**2. Export of units and pending-labels.** No CSV/Excel export exists
anywhere in this app — `shared/services/excel/` is an empty reserved
directory, so there is no convention to match yet. Whoever builds the first
export should establish it there, and units is a reasonable first consumer
(unit list with status, plus a printed-vs-pending summary).

**3. «تولید برچسب» shortcut on the receiving screen.** After confirming a
receiving round the worker knows exactly how many healthy units arrived;
offering the action there, pre-filled, saves re-finding the product. The
page is already URL-addressable for exactly this —
`/warehouse/unit-labels?product=<id>&qty=<n>` generates and opens the print
overlay — and the unit `source` field is shaped for it
(`{ type: "purchase", refId, refNumber }`), so no rework of the labels page
is needed.

**4. Move `ProductBarcodeDisplay` onto the shared barcode component.**
`features/warehouse/products/components/forms/ProductBarcodeDisplay.jsx`
still wraps `react-barcode` directly while everything new goes through
`shared/components/print/BarcodeGraphic.jsx`. Right end state, but it
touches an already-shipped feature so it wants its own verification.

**5. Print-logging recovery is client-side only.** *(the silent-failure part
is fixed — see `usePrintLogStore` / `PrintLogAlert`.)* A failed
`markUnitsPrinted` now retries three times and, if it still fails, stays on
screen as a persistent, re-attemptable warning listing the affected unit
codes. What is still missing is durability: the queue lives in memory, so a
refresh loses it. That is deliberate while the data layer is mock — the
whole store resets on reload anyway, and persisting unit ids that no longer
exist would only produce retries that quietly do nothing. **With a real
backend this reconciliation belongs server-side**, not in a client store.

Note for whoever touches this next: do **not** reach for react-query's
`retry` option on this mutation. With `retry: 2` set, a failing mutation
neither retried nor reached `onError` — the error vanished completely,
which is the exact failure mode this alert exists to prevent. The retry
loop is therefore explicit in `mutations.js` (`withRetry`).

**6. Manual print verification.** `node scripts/build-label-print-check.js`
regenerates `Frontend/label-print-check.html` (gitignored), a self-contained
page that reproduces the sheet geometry, print CSS and JsBarcode settings
for print-preview checks without the dev server. It is a *reproduction* of
the app's output, not the app's own DOM — if `sheetPresets.js` or
`BarcodeGraphic.jsx` change, re-run the script and re-check.

### Reconcile the two disconnected product category lists

Found while adding auto-generated product code / barcode (Aug 2026).
Deliberately left out of scope — reconciling them is its own task.

There are two hardcoded category lists that do not overlap at all:

- `Frontend/src/features/warehouse/products/hooks/useProductForm.js` —
  `DEFAULT_CATEGORIES`: روغن موتور، فیلتر، لنت ترمز، برق و روشنایی، تسمه.
  These are what the product form offers in its dropdown.
- `Frontend/src/features/warehouse/products/services/mockData.js` — the
  `categories` array used to seed products: موتور، سیستم ترمز، سیستم تعلیق،
  برق و روشنایی، بدنه، گیربکس، سیستم خنک کننده.

Only برق و روشنایی is common to both, so existing products mostly carry
categories the form cannot select, and category filtering is split across
two vocabularies. Categories are also not entities — each one's `id` is
its own Persian name, and `CategoryManager` creates new ones the same way,
so they have no stable identifier.

`CATEGORY_CODES` in `mockData.js` (added for the code/barcode generator)
currently spans the union of both lists as a stand-in for real category
ids; it should collapse into whatever single source of truth this becomes.

### Migrate customers / suppliers / products to the shared table + filter primitives

Found during the purchases/sales/warehouse refactor (Aug 2026). Deliberately
left out of scope at the time — it is a separate task, not a cleanup step.

The refactor extracted a shared server-side table shell and a set of filter
primitives, and migrated six feature modules onto them:

- `Frontend/src/shared/components/table/` — `DataTable`, `DataTablePagination`,
  `SortIcon`, `TableLoadingSkeleton`, `PaymentProgress`, `PaymentTypeBadge`
- `Frontend/src/shared/components/filters/` — `FilterPanel`, `FilterSelect`,
  `FilterDateInput`, `FilterSearchInput`, `EntityMultiSelect`, `filterUtils`

Three modules still carry the old hand-rolled versions:

| File | Lines | Note |
| --- | ---: | --- |
| `Frontend/src/features/customers/components/CustomerTable.jsx` | 332 | own copy of the table shell |
| `Frontend/src/features/suppliers/components/SupplierTable.jsx` | 321 | own copy of the table shell |
| `Frontend/src/features/warehouse/products/components/table/ProductTable.jsx` | 327 | own copy of the table shell |
| `Frontend/src/features/customers/components/CustomerFilters.jsx` | 126 | 98% identical to SupplierFilters |
| `Frontend/src/features/suppliers/components/SupplierFilters.jsx` | 91 | 98% identical to CustomerFilters |

Roughly 980 lines of table shell duplicating what is already in `shared/`,
plus a near-exact filter pair.

For reference, the six migrated modules each ended up as a `columns` array
plus a `<DataTable>` call (e.g. `PurchaseTable.jsx` went 340 -> 120 lines).
`ReceivingTable` shows how to pass a custom row key via `getRowKey`, and
`PurchaseReturnTable` shows `emptyState` and `rowClassName`.

Suggested shape: one commit per module, adopting `DataTable` first, then the
filter primitives, then the `createFilterStore` factory if those stores are
not already on it. Verify each in the browser — these three list pages are
not covered by the earlier walkthroughs.
