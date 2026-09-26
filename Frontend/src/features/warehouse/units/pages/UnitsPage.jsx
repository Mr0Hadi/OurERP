import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import { Printer } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import { parseBarcode } from "@/shared/domain/barcode/productCode";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { useSuppliersQuery } from "@/features/suppliers/services/queries";
import { useCustomersQuery } from "@/features/customers/services/queries";

import {
  LABEL_FILTERS,
  effectiveUnitFilters,
  fa,
  segmentFromLegacyView,
} from "../domain/unitVocabulary";
import { fetchAllProductUnits } from "../services/api-v1";
import { useProductUnitsQuery, useProductUnitSummaryQuery } from "../services/queries";
import { useResolveScannedCodeMutation } from "../services/mutations";
import { URL_FILTER_KEYS, useProductUnitFilterStore } from "../store/unitFilterStore";
import UnitSearchField from "../components/UnitSearchField";
import UnitFilterBar from "../components/UnitFilterBar";
import UnitViewNav from "../components/UnitViewNav";
import UnitBulkBar from "../components/UnitBulkBar";
import UnitsList from "../components/UnitsList";
import UnitDetailSheet from "../components/UnitDetailSheet";
import UnitActionDialog from "../components/UnitActionDialog";
import LabelPrintDesigner from "../components/LabelPrintDesigner";

const PICKER_PAGINATION = { pageIndex: 0, pageSize: 200 };
const NAME_SORTING = { id: "name", desc: false };
const NO_FILTERS = {};

/** سقفِ «انتخاب همه‌ی نتایج» — بیشتر از این یعنی فیلترِ دقیق‌تر. */
const BULK_LIMIT = 2000;

/** مقدارِ پارامترِ آدرس: `segment` و `labelFilter` رشته، بقیه عدد (شناسه یا enum). */
const parseUrlValue = (key, raw) =>
  key === "segment" || key === "labelFilter" ? raw : Number(raw) || "";

/**
 * دانه‌ها و برچسب‌ها — مدیریتِ هر دانه‌ی فیزیکیِ کالا در یک صفحه:
 *
 *  - **کجاست؟** جایگاهِ هر دانه (انبار، قرنطینه، نزدِ مشتری، نزدِ تامین‌کننده،
 *    اسقاط) با شمارش، و در جزئیاتش مسیر و تاریخچه‌ی کامل.
 *  - **قرنطینه:** تعیین تکلیف کنارِ هر دانه — عودت به تامین‌کننده (مرجوعیِ
 *    خرید)، بازگشت به موجودی یا اسقاط.
 *  - **برچسب:** «بدون برچسب» صفِ چاپ است؛ انتخابِ دسته‌ای (یا اسکنِ
 *    پیاپیِ دانه‌ها) و چاپ با طراحِ برچسب (اندازه، بارکد/QR، متن‌ها).
 *  - **کارها:** هر کار (چاپ، قرنطینه، بازگشت به موجودی، اسقاط، عودت) هم تکی
 *    از «جزئیات» و هم دسته‌ای با انتخاب و نوارِ پایینِ صفحه.
 *
 * چیدمان مثلِ «دسترسی کارمندان»: ستونِ کناری (کالا + نماهای جایگاه و برچسب،
 * با شمارش) و کنارش سربرگِ نمای جاری و فهرست. شکستن با عرضِ پنجره است نه
 * عرضِ محتوا، تا با باز شدنِ منوی اصلیِ سایت ستون بسته نشود؛ در عرضِ کم
 * نماها دو انتخاب‌گرند.
 *
 * یک فیلدِ اسکن/جست‌وجو: تایپ فهرست را فیلتر می‌کند؛ اسکن یا Enter روی
 * بارکدِ دانه جزئیاتش را باز می‌کند (یا در «اسکنِ پیاپی» به انتخاب اضافه‌اش
 * می‌کند) و بارکدِ کالا فهرست را روی همان کالا می‌برد.
 *
 * پیوند از صفحه‌های دیگر با پارامترِ آدرس: `?productId=`، `?purchaseId=`،
 * `?saleId=`، `?segment=quarantine`، `?labelFilter=unprinted`، `?unit=<بارکد>`،
 * و `?view=unlabeled` (قدیمی).
 */
export default function UnitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can, isError: permissionsUnknown } = usePermission();
  const canManage = permissionsUnknown || can("ProductUnitManage");

  const store = useProductUnitFilterStore();
  const { pagination, sorting } = store;

  const [scanToSelect, setScanToSelect] = useState(false);
  const [activeUnit, setActiveUnit] = useState(null);
  const [actionRequest, setActionRequest] = useState(null);
  const [printUnits, setPrintUnits] = useState(null);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  // خودِ دانه نگه داشته می‌شود نه فقط شناسه: صفحه‌بندی سمتِ سرور است و
  // دانه‌های صفحه‌ی قبل دیگر در فهرست نیستند ولی باید چاپ شوند.
  const [selectedById, setSelectedById] = useState(() => new Map());

  // ─── داده ─────────────────────────────────────────────────────────────────

  const search = useDebouncedValue(store.search, 400);
  const fromSerial = useDebouncedValue(store.fromSerial, 400);
  const toSerial = useDebouncedValue(store.toSerial, 400);

  const listFilters = useMemo(
    () =>
      effectiveUnitFilters({
        segment: store.segment,
        labelFilter: store.labelFilter,
        search,
        productId: store.productId,
        custodyReason: store.custodyReason,
        supplierId: store.supplierId,
        customerId: store.customerId,
        purchaseId: store.purchaseId,
        saleId: store.saleId,
        fromDate: store.fromDate,
        toDate: store.toDate,
        fromSerial,
        toSerial,
      }),
    [
      store.segment,
      store.labelFilter,
      search,
      store.productId,
      store.custodyReason,
      store.supplierId,
      store.customerId,
      store.purchaseId,
      store.saleId,
      store.fromDate,
      store.toDate,
      fromSerial,
      toSerial,
    ],
  );

  const unitsQuery = useProductUnitsQuery(listFilters, pagination, sorting);
  const summaryQuery = useProductUnitSummaryQuery(store.productId);
  const summary = summaryQuery.isError ? null : summaryQuery.data;

  const productsQuery = useProductsQuery(NO_FILTERS, PICKER_PAGINATION, null);
  const suppliersQuery = useSuppliersQuery(NO_FILTERS, PICKER_PAGINATION, NAME_SORTING);
  const customersQuery = useCustomersQuery(NO_FILTERS, PICKER_PAGINATION, NAME_SORTING);

  const units = unitsQuery.data?.items ?? [];
  const totalResults = unitsQuery.data?.total ?? 0;
  const selectedUnits = useMemo(() => [...selectedById.values()], [selectedById]);
  const selectedIds = useMemo(() => new Set(selectedById.keys()), [selectedById]);

  // ─── پیوندِ ورودی ─────────────────────────────────────────────────────────

  const resolveCode = useResolveScannedCodeMutation();

  useEffect(() => {
    const values = { ...segmentFromLegacyView(searchParams.get("view")) };
    URL_FILTER_KEYS.forEach((key) => {
      const raw = searchParams.get(key);
      if (raw) values[key] = parseUrlValue(key, raw);
    });
    const unitCode = searchParams.get("unit");

    if (Object.keys(values).length) store.openWith(values);
    if (unitCode) {
      resolveCode.mutate(unitCode, {
        onSuccess: (result) =>
          result.kind === BarcodeReferenceKindEnum.UNIT
            ? setActiveUnit(result.unit)
            : toast.error("دانه‌ای با این بارکد پیدا نشد."),
      });
    }
    if (Object.keys(values).length || unitCode) setSearchParams({}, { replace: true });
    // فقط یک بار، هنگامِ ورود به صفحه.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── انتخاب ──────────────────────────────────────────────────────────────

  const clearSelection = () => setSelectedById(new Map());

  const toggleSelect = useCallback(
    (unit) =>
      setSelectedById((prev) => {
        const next = new Map(prev);
        if (next.has(unit.id)) next.delete(unit.id);
        else next.set(unit.id, unit);
        return next;
      }),
    [],
  );

  const toggleSelectAll = useCallback(
    (rows, shouldSelect) =>
      setSelectedById((prev) => {
        const next = new Map(prev);
        rows.forEach((row) => (shouldSelect ? next.set(row.id, row) : next.delete(row.id)));
        return next;
      }),
    [],
  );

  const selectAllResults = async () => {
    setIsFetchingAll(true);
    try {
      const result = await fetchAllProductUnits(listFilters, { limit: BULK_LIMIT, sorting });
      if (result.truncated) {
        toast(`فقط ${fa(BULK_LIMIT)} دانه‌ی اول از ${fa(result.total)} انتخاب شد؛ فیلتر را دقیق‌تر کنید.`);
      }
      setSelectedById(new Map(result.items.map((unit) => [unit.id, unit])));
    } catch (error) {
      toast.error(error?.message || "خواندنِ نتایج انجام نشد");
    } finally {
      setIsFetchingAll(false);
    }
  };

  // ─── اسکن / جست‌وجو ──────────────────────────────────────────────────────

  /**
   * Enter یا اسکن: بارکدِ دانه → جزئیات (یا افزودن به انتخاب در «اسکنِ
   * پیاپی»)، بارکدِ کالا → فهرستِ همان کالا، متنِ عادی → همان جست‌وجوی
   * فهرست که با تایپ اعمال شده.
   */
  const handleScan = (code) => {
    // متنِ عادی همان جست‌وجوی فهرست است که با تایپ اعمال شده.
    if (parseBarcode(code).kind === BarcodeReferenceKindEnum.UNKNOWN) return;
    resolveCode.mutate(code, {
      onSuccess: (result) => {
        if (result.kind === BarcodeReferenceKindEnum.PRODUCT && result.product) {
          store.setSearch("");
          store.setProductId(result.product.id);
          toast.success(`فهرست روی «${result.product.name}»`);
          return;
        }
        if (result.kind !== BarcodeReferenceKindEnum.UNIT || !result.unit) {
          toast.error("این کد به هیچ دانه یا کالایی نمی‌خورد.");
          return;
        }
        store.setSearch("");
        if (!scanToSelect) {
          setActiveUnit(result.unit);
          return;
        }
        if (selectedById.has(result.unit.id)) {
          toast(`سریال ${fa(result.unit.serialNumber)} قبلاً انتخاب شده`);
          return;
        }
        toggleSelect(result.unit);
        toast.success(`${result.unit.productName ?? ""}، سریال ${fa(result.unit.serialNumber)} اضافه شد`);
      },
    });
  };

  // ─── کارها ───────────────────────────────────────────────────────────────

  const changeSegment = (segment) => {
    if (segment === store.segment) return;
    clearSelection();
    store.setSegment(segment);
  };

  const requestAction = useCallback(
    (action, targetUnits) => setActionRequest({ action, units: targetUnits }),
    [],
  );

  const handleActionDone = (affected) => {
    setActionRequest(null);
    setActiveUnit(null);
    setSelectedById((prev) => {
      const next = new Map(prev);
      affected.forEach((unit) => next.delete(unit.id));
      return next;
    });
  };

  const openPrint = (targetUnits) => {
    setActiveUnit(null);
    setPrintUnits(targetUnits);
  };

  /** بعد از چاپِ تأییدشده‌ی انتخاب، انتخاب کارش را کرده و پاک می‌شود. */
  const closePrint = (printed) => {
    if (printed && printUnits === selectedUnits) clearSelection();
    setPrintUnits(null);
  };

  const changeLabelFilter = (labelFilter) => {
    if (labelFilter === (store.labelFilter || "")) return;
    clearSelection();
    store.setLabelFilter(labelFilter);
  };

  const clearFilters = () => {
    clearSelection();
    store.clearAdvanced();
    store.setSearch("");
  };

  const viewNavProps = {
    segment: store.segment,
    labelFilter: store.labelFilter,
    summary,
    onSegmentChange: changeSegment,
    onLabelFilterChange: changeLabelFilter,
  };

  const currentPage = unitsQuery.data?.page ? unitsQuery.data.page - 1 : pagination.pageIndex;
  const isPrintQueue = store.labelFilter === LABEL_FILTERS.UNPRINTED;
  const hasFilters = Boolean(
    store.search ||
      store.productId ||
      store.supplierId ||
      store.customerId ||
      store.purchaseId ||
      store.saleId ||
      store.fromDate ||
      store.toDate ||
      store.fromSerial ||
      store.toSerial ||
      store.custodyReason,
  );

  const products = productsQuery.data?.items ?? [];
  const productName = store.productId
    ? products.find((product) => String(product.id) === String(store.productId))?.name
    : null;
  const resultsText = unitsQuery.isLoading ? "در حال بارگذاری…" : `${fa(totalResults)} دانه`;

  return (
    <div className="w-full">
      {/* <UnitViewNav
        variant="pane"
        className="hidden lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100svh-6.5rem)]"
        header={
          <div className="[&_label]:sr-only">
            <EntitySelect
              label="کالا"
              placeholder="همه‌ی کالاها"
              emptyText="کالایی یافت نشد"
              items={products}
              value={store.productId}
              onSelect={(id) => store.setProductId(id)}
              renderMeta={(product) => product.code}
            />
          </div>
        }
        footerText={`${resultsText} در این نما`}
        {...viewNavProps}
      /> */}

      <main className="flex min-w-0 flex-col gap-3">
        {/* کارت اصلی: ناحیه فیلتر/سربرگ + بدنه لیست */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {/* ناحیه بالایی: فیلترها و سربرگ نما */}
          <div className="space-y-3 p-3 sm:p-4">
            <UnitFilterBar
              store={store}
              search={
                <UnitSearchField
                  value={store.search}
                  onChange={store.setSearch}
                  onScan={handleScan}
                  isBusy={resolveCode.isPending}
                  scanToSelect={scanToSelect}
                  onScanModeChange={setScanToSelect}
                />
              }
              products={products}
              suppliers={suppliersQuery.data?.items ?? []}
              customers={customersQuery.data?.items ?? []}
              isLoadingParties={suppliersQuery.isLoading || customersQuery.isLoading}
            />

            {/* سربرگِ نمای جاری — همان کارتِ سربرگِ کارمند در «دسترسی کارمندان». */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3">
              <UnitViewNav variant="select" className="w-full" {...viewNavProps} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">
                  {[productName && `کالا: ${productName}`, resultsText]
                    .filter(Boolean)
                    .join("، ")}
                </p>
              </div>
              {isPrintQueue && totalResults > 0 && selectedUnits.length === 0 && (
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={isFetchingAll}
                  onClick={selectAllResults}
                >
                  <Printer className="size-4" />
                  {isFetchingAll ? "در حال انتخاب…" : "انتخاب همه برای چاپ"}
                </Button>
              )}
            </div>
          </div>

          {/* بدنه لیست: جدا شده با border-t و padding مستقل */}
          <div className="border-t border-border p-3 sm:p-4">
            {unitsQuery.isError ? (
              <QueryErrorState
                error={unitsQuery.error}
                onRetry={() => unitsQuery.refetch()}
              />
            ) : (
              <FetchingOverlay active={unitsQuery.isFetching && !unitsQuery.isLoading}>
                <UnitsList
                  units={units}
                  segment={store.segment}
                  labelFilter={store.labelFilter}
                  hasFilters={hasFilters}
                  onClearFilters={clearFilters}
                  isLoading={unitsQuery.isLoading}
                  totalPages={unitsQuery.data?.totalPages ?? 1}
                  currentPage={currentPage}
                  pageSize={pagination.pageSize}
                  onPaginationChange={store.setPagination}
                  sorting={sorting}
                  onSortingChange={store.setSorting}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onOpenUnit={setActiveUnit}
                />
              </FetchingOverlay>
            )}
          </div>
        </div>

        <UnitBulkBar
          selectedUnits={selectedUnits}
          totalResults={totalResults}
          isSelectingAll={isFetchingAll}
          onSelectAllResults={selectAllResults}
          onPrint={openPrint}
          onAction={requestAction}
          onClear={clearSelection}
          canManage={canManage}
        />
      </main>

      <UnitDetailSheet
        unit={activeUnit}
        open={Boolean(activeUnit)}
        onOpenChange={(open) => !open && setActiveUnit(null)}
        onPrint={(unit) => openPrint([unit])}
        onAction={requestAction}
        canManage={canManage}
      />

      <UnitActionDialog
        request={actionRequest}
        onOpenChange={(open) => !open && setActionRequest(null)}
        onDone={handleActionDone}
      />

      <LabelPrintDesigner units={printUnits} onClose={closePrint} />
    </div>
  );
}