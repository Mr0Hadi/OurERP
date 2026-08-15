# Notes

Findings worth acting on later. Add new items at the top of "Open".

## Open

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
