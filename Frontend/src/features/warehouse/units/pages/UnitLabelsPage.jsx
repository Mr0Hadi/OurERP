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
import PrintPreviewOverlay from "@/shared/components/print/PrintPreviewOverlay";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import { useProductUnitsQuery } from "../services/queries";
import { useResolveScannedCodeMutation } from "../services/mutations";
import {
  useProductUnitFilterStore,
  usePrintPreferenceStore,
} from "../store/unitFilterStore";
import UnitsTable from "../components/UnitsTable";
import UnitFilters from "../components/UnitFilters";
import UnitLabel from "../components/UnitLabel";
import UnitScanBar from "../components/UnitScanBar";
import UnitDetailSheet from "../components/UnitDetailSheet";
import UnitBulkBar from "../components/UnitBulkBar";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";

/**
 * صفحه‌ی برچسبِ دانه‌ها: پیدا کردن دانه (با اسکن یا فیلتر) و چاپِ
 * برچسبش.
 *
 * دانه‌ها اینجا ساخته یا ویرایش نمی‌شوند — بکند خودش آن‌ها را هم‌زمان
 * با موجودیِ کالا می‌سازد و وضعیتشان را از مسیرِ فروش/مرجوعی عوض
 * می‌کند. چاپ هم یک کارِ کاملاً سمتِ مرورگر است و چیزی در سرور ثبت
 * نمی‌کند (سرور فیلدی برای سابقه‌ی چاپ ندارد).
 */
export default function UnitLabelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [printItems, setPrintItems] = useState([]);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [activeUnit, setActiveUnit] = useState(null);
  const [scanMiss, setScanMiss] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const unitsStore = useProductUnitFilterStore();
  const { sheetPresetKey, setSheetPresetKey } = usePrintPreferenceStore();

  const unitsSearch = useDebouncedValue(unitsStore.globalSearch, 400);

  const resolveCode = useResolveScannedCodeMutation();

  const unitsQuery = useProductUnitsQuery(
    { globalSearch: unitsSearch, status: unitsStore.status },
    unitsStore.pagination,
    unitsStore.sorting,
  );

  const openPrintDialog = (units) => {
    setPrintItems(units);
    setIsPrintOpen(true);
  };

  const handleScan = (code) => {
    setScanMiss(null);
    resolveCode.mutate(code, {
      onSuccess: (result) => {
        if (result.kind === BarcodeReferenceKindEnum.UNIT) setActiveUnit(result.unit);
        else if (result.kind === BarcodeReferenceKindEnum.PRODUCT) setScanMiss(result);
        else setScanMiss({ kind: BarcodeReferenceKindEnum.UNKNOWN, code });
      },
    });
  };

  /**
   * از «این بارکد کالاست» به دانه‌های همان کالا — نه به ساختِ دانه.
   * ساختن کارِ فرمِ کالاست (تغییرِ موجودی)، نه این صفحه.
   */
  const handleGoToProduct = (product) => {
    setScanMiss(null);
    unitsStore.setGlobalSearch(product.code || product.name);
  };

  /** ورودی از بیرون: `?unit=` یک دانه‌ی مشخص را باز می‌کند. */
  useEffect(() => {
    const unit = searchParams.get("unit");
    if (!unit) return;

    resolveCode.mutate(unit, {
      onSuccess: (result) =>
        result.kind === BarcodeReferenceKindEnum.UNIT
          ? setActiveUnit(result.unit)
          : setScanMiss({ kind: BarcodeReferenceKindEnum.UNKNOWN, code: unit }),
    });

    searchParams.delete("unit");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrintOne = (unit) => {
    setActiveUnit(null);
    openPrintDialog([unit]);
  };

  const unitRows = unitsQuery.data?.items ?? [];
  const selectedUnits = unitRows.filter((unit) => selectedIds.has(unit.id));

  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = (rows, shouldSelect) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      rows.forEach((row) =>
        shouldSelect ? next.add(row.id) : next.delete(row.id),
      );
      return next;
    });

  return (
    <div className="container mx-auto space-y-4">
      <UnitScanBar
        onScan={handleScan}
        scanMiss={scanMiss}
        isSearching={resolveCode.isPending}
        onGoToProduct={handleGoToProduct}
      />

      <Card>
        <CardHeader className="pb-0">
          <CardTitle>برچسب کالاها</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 pt-4">
          <UnitFilters
            globalSearch={unitsStore.globalSearch}
            status={unitsStore.status}
            onSearchChange={unitsStore.setGlobalSearch}
            onStatusChange={unitsStore.setStatus}
            onReset={unitsStore.resetFilters}
          />

          <UnitBulkBar
            count={selectedUnits.length}
            onPrint={() => openPrintDialog(selectedUnits)}
            onClear={() => setSelectedIds(new Set())}
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
                data={unitRows}
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
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
              />
            </FetchingOverlay>
          )}
        </CardContent>
      </Card>

      <UnitDetailSheet
        unit={activeUnit}
        open={!!activeUnit}
        onOpenChange={(open) => !open && setActiveUnit(null)}
        onPrint={handlePrintOne}
      />

      <PrintPreviewOverlay
        open={isPrintOpen}
        onOpenChange={setIsPrintOpen}
        title="چاپ برچسب دانه‌ها"
        items={printItems}
        renderItem={(unit) => <UnitLabel unit={unit} />}
        getItemKey={(unit) => unit.id}
        presetKey={sheetPresetKey}
        onPresetKeyChange={setSheetPresetKey}
      />
    </div>
  );
}
