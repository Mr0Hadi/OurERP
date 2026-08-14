# Notes

Findings worth acting on later. Add new items at the top of "Open".

## Open

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
