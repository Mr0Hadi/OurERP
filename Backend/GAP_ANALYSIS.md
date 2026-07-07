# Frontend ↔ Backend Gap Analysis

> Generated to document features present in the frontend UI (`../front/OurERP/web`) that are **NOT** covered by the WMS MVP specification (`wms-mvp-spec.md`).
> The backend has been updated to cover all frontend API expectations. This document lists the extra scope discovered.

---

## 1. Settings Module (not in MVP spec)

The frontend has a complete **Settings** sidebar section with 8 sub-pages. The MVP spec contains **no settings module** at all.

| Frontend Route | Page | Status |
|----------------|------|--------|
| `/settings/general` | General settings | Placeholder |
| `/settings/company` | Company profile | **Needs API** |
| `/settings/invoice` | Invoice print settings | Placeholder |
| `/settings/tax` | Tax settings | Placeholder |
| `/settings/users` | User management | Backend has `/api/users` |
| `/settings/roles` | Roles & permissions | **Needs API** |
| `/settings/notifications` | Notification settings | Placeholder |
| `/settings/backup` | Backup | **Needs API** |

**Backend coverage:** User management exists. Company profile and backup endpoints are candidates for addition.

---

## 2. Tools Section (not in MVP spec)

The frontend defines a "Tools" section in the sidebar with calculator/utility pages:

| Tool | Route | Notes |
|------|-------|-------|
| Number to words | `/tools/number-to-words` | Persian number spelling |
| Calendar | `/tools/calendar` | Jalali calendar |
| Calculator | `/tools/calculator` | Scientific calculator |
| Barcode generator | `/tools/barcode` | Generate barcodes for products |
| QR Code generator | `/tools/qrcode` | Generate QR codes |

None of these require backend APIs (pure client-side). The barcode/QR generators could optionally POST generated codes to products.

---

## 3. Feedback / Support Page (not in MVP spec)

- Route `/feedback` exists in navigation data
- Page is a placeholder
- No backend API defined

---

## 4. Purchases Returns (separate from Sales Returns)

The MVP spec only defines **Sales Returns** (return goods from a customer). The frontend adds a **Purchases Returns** flow:

- `/purchases/returns/new` — register return of goods **to a supplier**
- `/purchases/returns` — list of purchase returns

The backend has no "return to supplier" entity. This is a net-new concept beyond MVP.

---

## 5. Sales Orders sub-page (not in MVP spec)

- Route `/sales/orders` — separate list of "sales orders"
- The MVP spec defines a single sales flow (proforma → confirmed → dispatched → delivered)
- The frontend separates "Sales" (orders) from "Invoices" (billing)

Backend now exposes `/api/sales` to cover the Sales flow. The standalone "Invoice" module remains a frontend placeholder.

---

## 6. Standalone Invoice Module (frontend placeholder, partially in MVP)

- Routes: `/invoice`, `/invoice/list`, `/invoice/new`, `/invoice/:id`
- All frontend pages are **empty placeholders** (no mock API calls)
- The MVP spec describes the invoice/sales flow in detail
- Backend keeps the original `/api/invoices` endpoints; frontend has not wired them up yet

---

## 7. Financial & Profit-Loss Reports (beyond MVP)

The MVP spec lists exactly 5 reports:
1. Current stock levels
2. Low-stock alert list
3. Sales summary by period
4. Customer balance list
5. Purchase order list by status

The frontend adds 2 more report pages:
- `/reports/financial` — Financial report
- `/reports/profit-loss` — Profit & loss statement

These require new backend endpoints (revenue − COGS, etc.).

---

## 8. Warehouse Receiving Module (separate from Purchase Orders)

The MVP spec folds goods receipt into the Purchase Order lifecycle (`RECEIVED` status). The frontend treats **Receiving** as a standalone module:

- `/warehouse/receiving` — list of receiving records
- `/warehouse/receiving/:id` — receiving detail/edit

Receiving has its own status flow: `pending → partial → completed → cancelled`

Backend now exposes `/api/receivings` as a distinct entity.

---

## 9. Extra Route Paths Not Wired to Router

Navigation data references routes that have **no router entry** in the frontend:

- `/invoice/list`, `/invoice/new`, `/invoice/:id`
- `/transactions/buy-sell`, `/transactions/payments`, `/transactions/returns`
- `/tools/number-to-words`, `/tools/calendar` (tools defined in nav but routes may 404)
- `/feedback`

---

## 10. Permission Model (richer than MVP)

The MVP spec defines 5 flat roles (`admin`, `sales`, `warehouse`, `accounting`, `procurement`).

The frontend uses a **granular permission string** system:

```
sales, sales_create, sales_view, sales_edit, sales_delete,
sales_invoice, sales_proforma, sales_returns,
purchases, purchases_create, purchases_view, purchases_edit, purchases_delete, purchases_returns,
warehouse, warehouse_view, warehouse_create, warehouse_edit, warehouse_delete,
warehouse_stock, warehouse_receiving,
customers, customers_view, customers_create,
suppliers, suppliers_view, suppliers_create,
reports, reports_sales, reports_purchases, reports_financial, reports_profit_loss, reports_warehouse,
invoice, invoice_view, invoice_create,
settings, settings_general, settings_company, settings_invoice, settings_tax,
settings_users, settings_roles, settings_notifications, settings_backup,
support, tools, all
```

Plus 4 **teams** (sales / purchases / warehouse / admin-all) with the `all` permission granting full access.

The backend JWT currently embeds only `role` and `department`. A permission-mapping layer is needed to fully enforce the frontend's granular model.

---

## 11. Persistent Form Stores (frontend-only)

The frontend persists draft forms in Zustand stores:
- `saleFormStore` (persisted)
- `receivingFormStore` (persisted)
- `purchaseFormStore` (persisted)

This is a frontend resilience feature; no backend change required.

---

## Summary

| # | Extra Feature | Backend Action |
|---|---------------|----------------|
| 1 | Settings module | Partial (users only) |
| 2 | Tools (5 utilities) | None (client-side) |
| 3 | Feedback page | None (placeholder) |
| 4 | Purchase returns | Not yet implemented |
| 5 | Sales orders sub-page | Covered by `/api/sales` |
| 6 | Standalone invoice module | Backend exists, frontend placeholder |
| 7 | Financial & P/L reports | Not yet implemented |
| 8 | Warehouse receiving | **Implemented** (`/api/receivings`) |
| 9 | Unwired route paths | Frontend concern |
| 10 | Granular permissions | Backend uses flat roles |
| 11 | Persistent form stores | Frontend-only |

### Backend work completed this session
- [x] Products: added `brand`, `category`, `tax` fields + `search`/`category`/`brand`/`min_price`/`max_price` filters
- [x] Suppliers: added `DELETE` (soft) + `search` filter
- [x] Customers: added `DELETE` (soft) + `search` filter
- [x] Auth: login now returns full user object
- [x] **Sales module** (`/api/sales`): CRUD + status + payment + stats
- [x] **Receiving module** (`/api/receivings`): CRUD

### Remaining backend work (post-MVP / extra)
- [ ] Settings: company profile + backup endpoints
- [ ] Reports: financial + profit-loss
- [ ] Purchase returns (return to supplier)
- [ ] Granular permission mapping in JWT
