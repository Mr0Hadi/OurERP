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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { LABEL_CODE_KIND_OPTIONS } from "@/shared/domain/barcode/barcodeConfig";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";

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

// همان الگوی فرم‌های فروش/خرید: فهرستِ کالا یک‌جا برای انتخاب‌گر.
const PRODUCT_PICKER_PAGINATION = { pageIndex: 0, pageSize: 200 };
const NO_FILTERS = {};

/**
 * صفحه‌ی برچسبِ دانه‌ها: پیدا کردن دانه (با اسکن یا فیلتر) و چاپِ
 * برچسبش.
 *
 * دانه‌ها اینجا ساخته یا ویرایش نمی‌شوند — بکند خودش آن‌ها را هم‌زمان
 * با موجودیِ کالا می‌سازد و وضعیتشان را از مسیرِ فروش/مرجوعی عوض
 * می‌کند. چاپ فقط برای دانه‌های انتخاب‌شده در جدول و کاملاً سمتِ مرورگر
 * است و چیزی در سرور ثبت نمی‌کند (سرور فیلدی برای سابقه‌ی چاپ ندارد).
 */
export default function UnitLabelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [printItems, setPrintItems] = useState([]);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [activeUnit, setActiveUnit] = useState(null);
  const [scanMiss, setScanMiss] = useState(null);
  // خودِ دانه نگه داشته می‌شود نه فقط شناسه‌اش: جدول صفحه‌بندیِ سرور دارد
  // و ردیف‌های صفحه‌ی قبلی دیگر در `unitRows` نیستند، ولی باید همچنان
  // شمرده و چاپ شوند.
  const [selectedUnitsById, setSelectedUnitsById] = useState(() => new Map());

  const unitsStore = useProductUnitFilterStore();
  const {
    sheetPresetKey,
    setSheetPresetKey,
    labelCodeKind,
    setLabelCodeKind,
  } = usePrintPreferenceStore();

  // سریال تایپی است؛ هر کلید یک درخواست نسازد.
  const fromSerial = useDebouncedValue(unitsStore.fromSerial, 400);
  const toSerial = useDebouncedValue(unitsStore.toSerial, 400);

  const resolveCode = useResolveScannedCodeMutation();

  const productsQuery = useProductsQuery(
    NO_FILTERS,
    PRODUCT_PICKER_PAGINATION,
    null,
  );
  const products = productsQuery.data?.items ?? [];

  const unitsQuery = useProductUnitsQuery(
    {
      productId: unitsStore.productId,
      status: unitsStore.status,
      fromSerial,
      toSerial,
    },
    unitsStore.pagination,
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
    unitsStore.setProductId(product.id);
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
  const selectedUnits = [...selectedUnitsById.values()];

  const toggleSelect = (unit) =>
    setSelectedUnitsById((prev) => {
      const next = new Map(prev);
      if (next.has(unit.id)) next.delete(unit.id);
      else next.set(unit.id, unit);
      return next;
    });

  const toggleSelectAll = (rows, shouldSelect) =>
    setSelectedUnitsById((prev) => {
      const next = new Map(prev);
      rows.forEach((row) =>
        shouldSelect ? next.set(row.id, row) : next.delete(row.id),
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
            products={products}
            isProductsLoading={productsQuery.isLoading}
            productId={unitsStore.productId}
            status={unitsStore.status}
            fromSerial={unitsStore.fromSerial}
            toSerial={unitsStore.toSerial}
            onProductChange={unitsStore.setProductId}
            onStatusChange={unitsStore.setStatus}
            onFromSerialChange={unitsStore.setFromSerial}
            onToSerialChange={unitsStore.setToSerial}
            onReset={unitsStore.resetFilters}
          />

          <UnitBulkBar
            count={selectedUnits.length}
            onPrint={() => openPrintDialog(selectedUnits)}
            onClear={() => setSelectedUnitsById(new Map())}
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
                onOpenUnit={setActiveUnit}
                selectedIds={selectedUnitsById}
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
        renderItem={(unit) => (
          <UnitLabel unit={unit} codeKind={labelCodeKind} />
        )}
        getItemKey={(unit) => unit.id}
        presetKey={sheetPresetKey}
        onPresetKeyChange={setSheetPresetKey}
        toolbar={
          <Select value={labelCodeKind} onValueChange={setLabelCodeKind}>
            <SelectTrigger dir="rtl" className="h-9 w-auto min-w-[11rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {LABEL_CODE_KIND_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
