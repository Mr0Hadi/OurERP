// src/features/warehouse/units/pages/UnitLabelsPage.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import PrintPreviewOverlay from "@/shared/components/print/PrintPreviewOverlay";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import {
  usePendingLabelProductsQuery,
  useProductUnitsQuery,
  useUnitLabelSummaryQuery,
} from "../services/queries";
import {
  useGenerateProductUnitsMutation,
  useMarkUnitsPrintedMutation,
  useFindUnitByCodeMutation,
} from "../services/mutations";
import {
  usePendingLabelFilterStore,
  useProductUnitFilterStore,
  usePrintPreferenceStore,
} from "../store/unitFilterStore";
import PendingLabelsTable from "../components/PendingLabelsTable";
import UnitsTable from "../components/UnitsTable";
import UnitFilters from "../components/UnitFilters";
import UnitLabel from "../components/UnitLabel";
import UnitLabelsSummary from "../components/UnitLabelsSummary";
import UnitScanBar from "../components/UnitScanBar";
import UnitDetailSheet from "../components/UnitDetailSheet";
import UnitViewSwitcher from "../components/UnitViewSwitcher";

const TABS = { PENDING: "pending", UNITS: "units" };

export default function UnitLabelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [printItems, setPrintItems] = useState([]);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [activeUnit, setActiveUnit] = useState(null);
  const [notFoundCode, setNotFoundCode] = useState("");

  // پارامترهای ورودی فقط یک‌بار، موقع باز شدن صفحه، خوانده می‌شوند.
  const [entryParams] = useState(() => ({
    unit: searchParams.get("unit"),
    product: searchParams.get("product"),
    qty: Number(searchParams.get("qty")) || 0,
  }));

  const [tab, setTab] = useState(() => {
    if (entryParams.unit) return TABS.UNITS;
    return searchParams.get("tab") === TABS.UNITS ? TABS.UNITS : TABS.PENDING;
  });

  const pendingStore = usePendingLabelFilterStore();
  const unitsStore = useProductUnitFilterStore();
  const { sheetPresetKey, setSheetPresetKey } = usePrintPreferenceStore();

  const pendingSearch = useDebouncedValue(pendingStore.globalSearch, 400);
  const unitsSearch = useDebouncedValue(unitsStore.globalSearch, 400);

  const generateUnits = useGenerateProductUnitsMutation();
  const markPrinted = useMarkUnitsPrintedMutation();

  const summaryQuery = useUnitLabelSummaryQuery();
  const findUnit = useFindUnitByCodeMutation();

  const pendingQuery = usePendingLabelProductsQuery(
    { globalSearch: pendingSearch, onlyPending: true },
    pendingStore.pagination,
    pendingStore.sorting,
  );

  const unitsQuery = useProductUnitsQuery(
    {
      globalSearch: unitsSearch,
      status: unitsStore.status,
      printState: unitsStore.printState,
    },
    unitsStore.pagination,
    unitsStore.sorting,
  );

  const openPrintDialog = (units) => {
    setPrintItems(units);
    setIsPrintOpen(true);
  };

  const handleScan = (code) => {
    setNotFoundCode("");
    findUnit.mutate(code, {
      onSuccess: (unit) => {
        if (unit) setActiveUnit(unit);
        else setNotFoundCode(code);
      },
    });
  };

  /**
   * ورودی از بیرون: ?product=&qty= برچسب‌های یک کالا را می‌سازد و
   * ?unit= یک واحد مشخص را باز می‌کند. صفحه‌ی «دریافت کالا» بعداً فقط
   * به همین آدرس لینک می‌دهد و این صفحه لازم نیست عوض شود.
   */
  useEffect(() => {
    const { unit, product, qty } = entryParams;

    if (unit) {
      findUnit.mutate(unit, {
        onSuccess: (found) =>
          found ? setActiveUnit(found) : setNotFoundCode(unit),
      });
    } else if (product && qty > 0) {
      generateUnits.mutate(
        { productId: Number(product), quantity: qty },
        { onSuccess: (units) => openPrintDialog(units) },
      );
    }

    if (unit || product) {
      ["unit", "product", "qty"].forEach((key) => searchParams.delete(key));
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = (row, quantity) => {
    generateUnits.mutate(
      { productId: row.productId, quantity },
      { onSuccess: (units) => openPrintDialog(units) },
    );
  };

  const handleReprint = (unit) => {
    setActiveUnit(null);
    openPrintDialog([unit]);
  };

  // «چاپ شد» یعنی برچسب واقعاً از پرینتر بیرون آمده؛ همان لحظه روی
  // واحدها ثبت می‌شود. چاپ مجدد رکورد تازه نمی‌سازد.
  const handlePrinted = () => {
    markPrinted.mutate(printItems.map((unit) => unit.id));
    setIsPrintOpen(false);
  };

  return (
    <div className="container mx-auto space-y-4">
      <UnitScanBar
        onScan={handleScan}
        notFoundCode={notFoundCode}
        isSearching={findUnit.isPending}
      />

      <UnitLabelsSummary
        summary={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
      />

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="sr-only">برچسب کالاها</CardTitle>
          <UnitViewSwitcher
            value={tab}
            onChange={setTab}
            options={[
              {
                value: TABS.PENDING,
                label: "نیازمند برچسب",
                count: summaryQuery.data?.productsNeedingLabels ?? 0,
              },
              { value: TABS.UNITS, label: "واحدها" },
            ]}
          />
        </CardHeader>

        <CardContent className="space-y-3 pt-4">
          {tab === TABS.PENDING ? (
            <>
              <div className="max-w-md">
                <FilterSearchInput
                  placeholder="نام یا کد کالا..."
                  value={pendingStore.globalSearch}
                  onChange={(e) => pendingStore.setGlobalSearch(e.target.value)}
                />
              </div>

              {pendingQuery.isError ? (
                <QueryErrorState
                  error={pendingQuery.error}
                  onRetry={() => pendingQuery.refetch()}
                />
              ) : (
                <FetchingOverlay
                  active={pendingQuery.isFetching && !pendingQuery.isLoading}
                >
                  <PendingLabelsTable
                    data={pendingQuery.data?.items ?? []}
                    isLoading={pendingQuery.isLoading}
                    totalPages={pendingQuery.data?.totalPages ?? 1}
                    currentPage={
                      pendingQuery.data?.page
                        ? pendingQuery.data.page - 1
                        : pendingStore.pagination.pageIndex
                    }
                    pageSize={pendingStore.pagination.pageSize}
                    onPaginationChange={pendingStore.setPagination}
                    sorting={pendingStore.sorting}
                    onSortingChange={pendingStore.setSorting}
                    onGenerate={handleGenerate}
                    pendingProductId={
                      generateUnits.isPending
                        ? generateUnits.variables?.productId
                        : null
                    }
                  />
                </FetchingOverlay>
              )}
            </>
          ) : (
            <>
              <UnitFilters
                globalSearch={unitsStore.globalSearch}
                status={unitsStore.status}
                printState={unitsStore.printState}
                onSearchChange={unitsStore.setGlobalSearch}
                onStatusChange={unitsStore.setStatus}
                onPrintStateChange={unitsStore.setPrintState}
                onReset={unitsStore.resetFilters}
              />

              {unitsQuery.isError ? (
                <QueryErrorState
                  error={unitsQuery.error}
                  onRetry={() => unitsQuery.refetch()}
                />
              ) : (
                <FetchingOverlay
                  active={unitsQuery.isFetching && !unitsQuery.isLoading}
                >
                  <UnitsTable
                    data={unitsQuery.data?.items ?? []}
                    isLoading={unitsQuery.isLoading}
                    totalPages={unitsQuery.data?.totalPages ?? 1}
                    currentPage={
                      unitsQuery.data?.page
                        ? unitsQuery.data.page - 1
                        : unitsStore.pagination.pageIndex
                    }
                    pageSize={unitsStore.pagination.pageSize}
                    onPaginationChange={unitsStore.setPagination}
                    sorting={unitsStore.sorting}
                    onSortingChange={unitsStore.setSorting}
                    onOpenUnit={setActiveUnit}
                  />
                </FetchingOverlay>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <UnitDetailSheet
        unit={activeUnit}
        open={!!activeUnit}
        onOpenChange={(open) => !open && setActiveUnit(null)}
        onReprint={handleReprint}
      />

      <PrintPreviewOverlay
        open={isPrintOpen}
        onOpenChange={setIsPrintOpen}
        title="چاپ برچسب واحدها"
        items={printItems}
        renderItem={(unit) => <UnitLabel unit={unit} />}
        getItemKey={(unit) => unit.id}
        onPrinted={handlePrinted}
        presetKey={sheetPresetKey}
        onPresetKeyChange={setSheetPresetKey}
      />
    </div>
  );
}
