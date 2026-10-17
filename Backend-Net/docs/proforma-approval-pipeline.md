# Proforma approval pipeline (sale side)

Agreed with the user and built 2026-10-16 (see the CLAUDE.md entry of that date). Sale side only; no company setting.
The implementation plan below is kept as the record of what was built; the migration is generated, not applied.

## Agreed behaviour

Stages live inside `Sale.Status = PROFORMA`; the whole proforma stays editable until the invoice is issued.

1. **DRAFT** - a line is refused when its quantity is more than the product's free stock (`Product.Stock`).
2. **CUSTOMER_APPROVED** - a checkbox by sales; record who/when.
3. **WAREHOUSE_CHECKED** - the warehouse scans every unit of every line. Scanned units become `RESERVED` (tied to the
   sale line) and leave `Product.Stock`; reserved quantity is shown next to stock. Inventory value is unchanged (no cost
   ledger row). This stage = ready for payment.
4. **Payment** - the first IN payment (or an installment plan's down payment) issues the invoice exactly as today
   (`SaleInvoiceFinalizer`) and locks the document. No IN payment is accepted before WAREHOUSE_CHECKED.

Edits:
- product/quantity change on a line, or line added/removed -> back to DRAFT, that line's reserved units back to IN_STOCK;
- price/discount/terms (payment type, due date, customer) -> back to DRAFT, reservations kept;
- notes/attachments -> no reset.
- Every approval records the `Revision` it approved.

Warehouse problem (rare): the employee scans/selects the unit barcode, picks a condition and must write a description;
employee id + time recorded automatically. The unit goes to QUARANTINED, custody `WAREHOUSE_HOLD`, at the running average
(same as `ApplyProductUnitAction` QUARANTINE). MISSING units too (they cannot be scanned - the frontend lets the employee
pick an IN_STOCK unit of that product from a list).
- Healthy replacement on the shelf -> they scan it, the proforma continues. **Accounting is never a gate.**
- No replacement -> shortage: the proforma goes back to DRAFT (customer) with the shortage noted; nothing reserved.
- Either way accounting gets the unit on its own page and decides: release (found / not damaged), scrap (loss booked),
  or keep for a supplier return (unit stays WAREHOUSE_HOLD for an ON_ORDER purchase-return claim on its line).
- Another proforma having reserved the last units is an ordinary shortage - no accounting involvement.

In-person sale: same stages back to back; `CreateInPersonSale` is split - after the warehouse check, one atomic command
takes payment (or installment plan) + ships the reserved units + DELIVERED.

## Implementation plan (as built)

**Domain**
- `SaleProformaStageEnum { DRAFT = 0, CUSTOMER_APPROVED = 1, WAREHOUSE_CHECKED = 2 }`; `Sale.ProformaStage`, `Sale.Revision`.
- `SaleProformaStageEvent` (append-only): SaleId, FromStage, ToStage, Kind (`SaleProformaEventEnum`: CUSTOMER_APPROVED,
  WAREHOUSE_CHECKED, WAREHOUSE_SHORTAGE, RESET_BY_EDIT), Revision, UserId, OccurredAt, Note (shortage text).
- `ProductUnitStatusEnum.RESERVED = 10` (5-8 stay free), `ProductUnit.SaleItemId` set while reserved.
  `ProductUnitMovementReasonEnum.SALE_RESERVED = 15`, `SALE_RESERVATION_RELEASED = 16`.
- `UnitActionReasonEnum.MISSING = 6` (reuse this enum as the condition; refuse INSPECTION_PASSED).
- `SaleWarehouseIssue`: SaleId, SaleItemId?, ProductId, ProductUnitId, Reason, Description (required), ReportedByUserId,
  ReportedAt, Resolution? (`SaleWarehouseIssueResolutionEnum`: RELEASE, SCRAP, SUPPLIER_RETURN), ResolvedAt,
  ResolvedByUserId, ResolutionNote.
- Add both new tables to `AuditRecorder`'s document resolution (DocumentKind SALE).

**Unit service** (`IProductUnitService`, the only writer of unit status): `ReserveAsync` (scanned IN_STOCK -> RESERVED on
a sale line), `ReleaseReservationAsync` (line's RESERVED -> IN_STOCK), and a consume path from RESERVED. Callers move
`Product.Stock` (-n on reserve, +n on release, untouched when shipping reserved units).

**Commands** (`Application/Features/Sale/Commands/`)
- `ApproveSaleProformaCommand { SaleId, Revision }` - DRAFT -> CUSTOMER_APPROVED, or straight to WAREHOUSE_CHECKED when
  every line is already fully reserved. Permission SaleUpdate.
- `CheckSaleWarehouseCommand { SaleId, Revision, Lines[{SaleItemId, ProductUnitBarcodes}], Issues[{ProductUnitBarcode,
  Reason, Description}] }` - all or nothing; issues quarantined first (ledger `RecordStockQuarantinedAsync`); lines
  already fully reserved need no barcodes; any line short -> no reservations, stage DRAFT, WAREHOUSE_SHORTAGE event.
- `ResolveSaleWarehouseIssueCommand { Id, Resolution, Note }` - RELEASE/SCRAP sent through IMediator as
  `ApplyProductUnitActionCommand`; SUPPLIER_RETURN only marks it resolved. Refused if the unit already left quarantine.
- Query `GetSaleWarehouseIssueList` (paged, SortBy + ThenSortBy(Id); add to `ListSortingTests`); `GetSaleList` gains a
  `ProformaStages` filter (warehouse queue); `SaleDto` gains stage, revision, stage history, per-line reserved quantity;
  product list/detail gain `ReservedQuantity` (subquery count of RESERVED units).

**Existing code to change**
- `CreateSaleCommand`: refuse `PaymentDetails` (a new sale is DRAFT); check quantity <= free stock.
- `UpdateSaleCommand`: free-stock check, the reset rules above, release reservations of changed/removed lines, `Revision++`.
- `AddSalePaymentCommand` and `CreateSaleInstallmentPlanCommand` (when DownPaymentAmount > 0): refuse on a PROFORMA not
  at WAREHOUSE_CHECKED.
- `UpdateSalePaymentDateCommand` on a PROFORMA past DRAFT: reset to DRAFT.
- `ShipSaleCommand`: a line with RESERVED units ships only from them (scanned barcodes must be among them), no second
  Stock decrement; legacy lines without reservations keep the old IN_STOCK path.
- `DeleteSaleCommand`, `ChangeSaleStatusCommand` (CANCELLED): release all reservations.
- `CreateInPersonSaleCommand` -> `CompleteInPersonSaleCommand { SaleId, Payments, InstallmentPlan, ShippingNote }` on a
  WAREHOUSE_CHECKED proforma (keep audit value 410, rename the member).
- Permissions: `SaleWarehouseCheck = 97` (Sale group), `SaleWarehouseIssueResolve = 261` (Accounting group; list takes
  AccountingView or it). Audit actions: `ApproveSaleProforma = 411`, `CheckSaleWarehouse = 412`,
  `ResolveSaleWarehouseIssue = 413`.
- Migration (existing PROFORMA rows -> DRAFT, Revision 0); generated, not applied. Tests, `docs/api-guide.fa.md`, CLAUDE.md.

**Caveat found:** `GetInventoryValuation` reads `Product.Stock`; once reserved units leave Stock, valuation must count
`Stock + reserved` (the goods are still ours).

## Reservation expiry (added 2026-10-17)

A reservation is held for the customer's payment for a limited time, set on the settings page
(`Sale.ReservationMinutes`, default 10, 0 = never; `api/Setting`).

- **Clock:** every successful `CheckSaleWarehouse` sets `Sale.ReservationExpiresAt = now + setting`, including lines kept
  reserved from an earlier check. The first payment (`SaleInvoiceFinalizer`) clears it: paid goods wait for shipping, not for
  the customer. Changing the setting affects later reservations only.
- **Payment refused from the deadline** (`SaleProformaPipeline.EnsureReadyForPayment`), whether or not the sweep has run.
  `ApproveSaleProforma` no longer jumps straight to WAREHOUSE_CHECKED on an expired reservation.
- **Sweep:** `WMS/BackgroundJobs/SaleReservationExpiryJob` (every 60 s, `BackgroundJobs:SaleReservationExpiry` in
  appsettings) sends one `ReleaseExpiredSaleReservationCommand` per sale whose deadline passed more than
  `ExpirySweepGrace` (1 minute) ago. That grace means a payment that passed its check just before the deadline can never race
  the sweep. The command releases every RESERVED unit (Stock back up), moves WAREHOUSE_CHECKED to CUSTOMER_APPROVED (the
  customer's approval of this revision still stands) and writes `RESERVATION_EXPIRED = 5`. It is idempotent.
- **IIS:** the job does not run while the app pool is asleep. Correctness does not depend on it (payment is refused at the
  deadline); only the moment units become free for other proformas is delayed.
- Migration `reservation-expiry-and-system-settings` gives proformas already holding reservations 10 minutes from the moment
  it runs. Generated, not applied.
