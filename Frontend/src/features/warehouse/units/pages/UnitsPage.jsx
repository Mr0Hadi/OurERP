import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import { ProductUnitStatusEnum as UNIT_STATUSES } from "@/shared/domain/enums/unitStatus";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { useSuppliersQuery } from "@/features/suppliers/services/queries";
import { useCustomersQuery } from "@/features/customers/services/queries";

import {
  SCAN_MODES,
  UNIT_VIEWS,
  UNIT_VIEW_LABELS,
  effectiveUnitFilters,
  fa,
} from "../domain/unitVocabulary";
import { downloadUnitsCsv } from "../domain/unitCsv";
import { fetchAllProductUnits } from "../services/api-v1";
import { useProductUnitsQuery, useProductUnitSummaryQuery } from "../services/queries";
import { useResolveScannedCodeMutation } from "../services/mutations";
import { URL_FILTER_KEYS, useProductUnitFilterStore } from "../store/unitFilterStore";
import UnitScanBar from "../components/UnitScanBar";
import UnitSummaryCards from "../components/UnitSummaryCards";
import UnitFilters from "../components/UnitFilters";
import UnitBulkBar from "../components/UnitBulkBar";
import UnitsList from "../components/UnitsList";
import UnitDetailSheet from "../components/UnitDetailSheet";
import UnitActionDialog from "../components/UnitActionDialog";
import UnitPrintDialog from "../components/UnitPrintDialog";
import StocktakePanel from "../components/StocktakePanel";

const PICKER_PAGINATION = { pageIndex: 0, pageSize: 200 };
const NAME_SORTING = { id: "name", desc: false };
const NO_FILTERS = {};

/** سقفِ «انتخاب همه‌ی نتایج» و خروجیِ همه — بیشتر از این یعنی فیلترِ دقیق‌تر. */
const BULK_LIMIT = 2000;

/** مقدارِ عددیِ پارامترِ آدرس (شناسه، enum)؛ `view` رشته می‌ماند. */
const parseUrlValue = (key, raw) => (key === "view" ? raw : Number(raw) || "");

/**
 * دانه‌ها و برچسب‌ها — مدیریتِ کاملِ هر دانه‌ی فیزیکیِ کالا:
 *
 *  - **کجاست؟** هر دانه در انبار، قرنطینه، نزدِ مشتری، نزدِ تامین‌کننده یا
 *    اسقاط؛ با تاریخچه‌ی کاملِ جابه‌جایی.
 *  - **قرنطینه:** علت، سن، سندِ منشأ و ارزش؛ آزادسازی و اسقاطِ دستی، یا
 *    ارجاع به مرجوعیِ خرید.
 *  - **برچسب:** صفِ دانه‌های بی‌برچسب، چاپِ دسته‌ای و ثبتِ اینکه کدام دانه
 *    کی و چند بار برچسب خورده.
 *  - **شمارش:** مقایسه‌ی قفسه با سیستم، دانه به دانه.
 *
 * پیوند از صفحه‌های دیگر با پارامترِ آدرس: `?productId=`، `?purchaseId=`،
 * `?view=unlabeled`، `?unit=<بارکد>` و …
 */
export default function UnitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = usePermission();
  const canManage = can("ProductUnitManage");

  const store = useProductUnitFilterStore();
  const { view, pagination, sorting } = store;

  const [scanMode, setScanMode] = useState(SCAN_MODES.OPEN);
  const [scanMiss, setScanMiss] = useState(null);
  const [lastAdded, setLastAdded] = useState(null);
  const [activeUnit, setActiveUnit] = useState(null);
  const [actionRequest, setActionRequest] = useState(null);
  const [printUnits, setPrintUnits] = useState(null);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  // خودِ دانه نگه داشته می‌شود نه فقط شناسه: صفحه‌بندی سمتِ سرور است و
  // دانه‌های صفحه‌ی قبل دیگر در فهرست نیستند ولی باید چاپ و شمرده شوند.
  const [selectedById, setSelectedById] = useState(() => new Map());

  // ─── داده ─────────────────────────────────────────────────────────────────

  const search = useDebouncedValue(store.search, 400);
  const fromSerial = useDebouncedValue(store.fromSerial, 400);
  const toSerial = useDebouncedValue(store.toSerial, 400);

  const listFilters = useMemo(
    () =>
      effectiveUnitFilters({
        view,
        search,
        productId: store.productId,
        status: store.status,
        custodyReason: store.custodyReason,
        labelState: store.labelState,
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
      view,
      search,
      store.productId,
      store.status,
      store.custodyReason,
      store.labelState,
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

  const isListView = view !== UNIT_VIEWS.STOCKTAKE;
  const unitsQuery = useProductUnitsQuery(listFilters, pagination, sorting, {
    enabled: isListView,
  });
  const summaryQuery = useProductUnitSummaryQuery(store.productId);

  const productsQuery = useProductsQuery(NO_FILTERS, PICKER_PAGINATION, null);
  const suppliersQuery = useSuppliersQuery(NO_FILTERS, PICKER_PAGINATION, NAME_SORTING);
  const customersQuery = useCustomersQuery(NO_FILTERS, PICKER_PAGINATION, NAME_SORTING);
  const products = productsQuery.data?.items ?? [];

  const units = unitsQuery.data?.items ?? [];
  const totalResults = unitsQuery.data?.total ?? 0;
  const selectedUnits = useMemo(() => [...selectedById.values()], [selectedById]);

  // ─── پیوندِ ورودی ─────────────────────────────────────────────────────────

  const resolveCode = useResolveScannedCodeMutation();

  useEffect(() => {
    const values = {};
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
            : setScanMiss({ kind: BarcodeReferenceKindEnum.UNKNOWN, code: unitCode }),
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

  const withAllResults = async (consume) => {
    setIsFetchingAll(true);
    try {
      const result = await fetchAllProductUnits(listFilters, { limit: BULK_LIMIT, sorting });
      if (result.truncated) {
        toast(`فقط ${fa(BULK_LIMIT)} دانه‌ی اول از ${fa(result.total)} خوانده شد؛ فیلتر را دقیق‌تر کنید.`);
      }
      consume(result.items);
    } catch (error) {
      toast.error(error?.message || "خواندنِ نتایج انجام نشد");
    } finally {
      setIsFetchingAll(false);
    }
  };

  const selectAllResults = () =>
    withAllResults((items) => setSelectedById(new Map(items.map((unit) => [unit.id, unit]))));

  const exportCsv = () =>
    selectedUnits.length
      ? downloadUnitsCsv(selectedUnits)
      : withAllResults((items) => downloadUnitsCsv(items));

  // ─── اسکن ────────────────────────────────────────────────────────────────

  const handleScan = (code) => {
    setScanMiss(null);
    resolveCode.mutate(code, {
      onSuccess: (result) => {
        if (result.kind !== BarcodeReferenceKindEnum.UNIT) {
          setScanMiss(
            result.kind === BarcodeReferenceKindEnum.PRODUCT
              ? result
              : { kind: BarcodeReferenceKindEnum.UNKNOWN, code },
          );
          return;
        }
        if (scanMode === SCAN_MODES.OPEN) {
          setActiveUnit(result.unit);
          return;
        }
        const duplicate = selectedById.has(result.unit.id);
        if (!duplicate) toggleSelect(result.unit);
        setLastAdded({ unit: result.unit, duplicate });
      },
    });
  };

  /** «این بارکدِ کالاست» → دانه‌های همان کالا، در همین تب. */
  const goToProduct = (product) => {
    setScanMiss(null);
    store.setProductId(product.id);
  };

  // ─── ناوبری بینِ تب‌ها و کارت‌ها ────────────────────────────────────────

  const changeView = (next) => {
    if (next === view) return;
    clearSelection();
    store.setView(next);
  };

  const selectSummary = (target) => {
    clearSelection();
    store.setView(target.view);
    if (target.view === UNIT_VIEWS.ALL) store.setStatus(target.status ?? "");
  };

  // ─── کارها ───────────────────────────────────────────────────────────────

  const requestAction = (action, targetUnits) => setActionRequest({ action, units: targetUnits });

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

  const summary = summaryQuery.data;
  const tabCount = {
    [UNIT_VIEWS.QUARANTINE]: summary?.byStatus?.[UNIT_STATUSES.QUARANTINED]?.count,
    [UNIT_VIEWS.UNLABELED]: summary?.unprintedCount,
  };

  return (
    <div className="container mx-auto space-y-4">
      <UnitScanBar
        mode={scanMode}
        onModeChange={(mode) => {
          setScanMode(mode);
          setLastAdded(null);
        }}
        onScan={handleScan}
        scanMiss={scanMiss}
        lastAdded={lastAdded}
        isSearching={resolveCode.isPending}
        onGoToProduct={goToProduct}
      />

      <UnitSummaryCards
        summary={summary}
        isLoading={summaryQuery.isLoading}
        isError={summaryQuery.isError}
        current={{ view, status: store.status }}
        onSelect={selectSummary}
      />

      <Tabs value={view} onValueChange={changeView} className="gap-3">
        <TabsList className="h-auto w-full flex-wrap sm:w-fit">
          {Object.values(UNIT_VIEWS).map((value) => (
            <TabsTrigger key={value} value={value} className="flex-1 gap-1.5 sm:flex-none">
              {UNIT_VIEW_LABELS[value]}
              {tabCount[value] > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-[11px] tabular-nums text-primary">
                  {fa(tabCount[value])}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isListView ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <UnitFilters
              filters={store}
              actions={store}
              products={products}
              isProductsLoading={productsQuery.isLoading}
              suppliers={suppliersQuery.data?.items ?? []}
              isSuppliersLoading={suppliersQuery.isLoading}
              customers={customersQuery.data?.items ?? []}
              isCustomersLoading={customersQuery.isLoading}
            />

            <UnitBulkBar
              selectedUnits={selectedUnits}
              totalResults={totalResults}
              isSelectingAll={isFetchingAll}
              onSelectAllResults={selectAllResults}
              onPrint={() => openPrint(selectedUnits)}
              onAction={(action) => requestAction(action, selectedUnits)}
              onExport={exportCsv}
              onClear={clearSelection}
              canManage={canManage}
            />

            {unitsQuery.isError ? (
              <QueryErrorState error={unitsQuery.error} onRetry={() => unitsQuery.refetch()} />
            ) : (
              <FetchingOverlay active={unitsQuery.isFetching && !unitsQuery.isLoading}>
                <UnitsList
                  units={units}
                  view={view}
                  isLoading={unitsQuery.isLoading}
                  totalPages={unitsQuery.data?.totalPages ?? 1}
                  currentPage={unitsQuery.data?.page ? unitsQuery.data.page - 1 : pagination.pageIndex}
                  pageSize={pagination.pageSize}
                  onPaginationChange={store.setPagination}
                  sorting={sorting}
                  onSortingChange={store.setSorting}
                  selectedIds={selectedById}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onOpenUnit={setActiveUnit}
                />
              </FetchingOverlay>
            )}
          </CardContent>
        </Card>
      ) : (
        <StocktakePanel
          products={products}
          isProductsLoading={productsQuery.isLoading}
          onOpenUnit={setActiveUnit}
        />
      )}

      <UnitDetailSheet
        unit={activeUnit}
        open={!!activeUnit}
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

      <UnitPrintDialog units={printUnits} onClose={closePrint} />
    </div>
  );
}
