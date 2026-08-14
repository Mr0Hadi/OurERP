// src/features/warehouse/units/pages/UnitLabelsPage.jsx
import { useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import PrintPreviewDialog from "@/shared/components/print/PrintPreviewDialog";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import {
  usePendingLabelProductsQuery,
  useProductUnitsQuery,
} from "../services/queries";
import {
  useGenerateProductUnitsMutation,
  useMarkUnitsPrintedMutation,
} from "../services/mutations";
import {
  usePendingLabelFilterStore,
  useProductUnitFilterStore,
} from "../store/unitFilterStore";
import PendingLabelsTable from "../components/PendingLabelsTable";
import UnitsTable from "../components/UnitsTable";
import UnitFilters from "../components/UnitFilters";
import UnitLabel from "../components/UnitLabel";

export default function UnitLabelsPage() {
  const [printItems, setPrintItems] = useState([]);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const pendingStore = usePendingLabelFilterStore();
  const unitsStore = useProductUnitFilterStore();

  const pendingSearch = useDebouncedValue(pendingStore.globalSearch, 400);
  const unitsSearch = useDebouncedValue(unitsStore.globalSearch, 400);

  const generateUnits = useGenerateProductUnitsMutation();
  const markPrinted = useMarkUnitsPrintedMutation();

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

  const handleGenerate = (row, quantity) => {
    generateUnits.mutate(
      { productId: row.productId, quantity },
      { onSuccess: (units) => openPrintDialog(units) },
    );
  };

  // «چاپ شد» یعنی برچسب واقعاً از پرینتر بیرون آمده؛ همان لحظه روی
  // واحدها ثبت می‌شود تا انباردار بداند کدام‌ها را چسبانده است.
  const handlePrinted = () => {
    markPrinted.mutate(printItems.map((unit) => unit.id));
  };

  const pendingRows = pendingQuery.data?.items ?? [];
  const unitRows = unitsQuery.data?.items ?? [];

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex sm:flex-row flex-col sm:items-center justify-between gap-2">
          <CardTitle>نیازمند برچسب</CardTitle>
          <div className="text-sm text-muted-foreground">
            کالاهایی که موجودی‌شان بیشتر از تعداد برچسب‌های ساخته‌شده است
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
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
                data={pendingRows}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex sm:flex-row flex-col sm:items-center justify-between gap-2">
          <CardTitle>واحدهای کالا</CardTitle>
          <div className="text-sm text-muted-foreground">
            ردیابی تک‌تک اقلام فیزیکی از انبار تا ارسال
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
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
                onReprint={(unit) => openPrintDialog([unit])}
              />
            </FetchingOverlay>
          )}
        </CardContent>
      </Card>

      <PrintPreviewDialog
        open={isPrintOpen}
        onOpenChange={setIsPrintOpen}
        title="چاپ برچسب واحدها"
        items={printItems}
        renderItem={(unit) => <UnitLabel unit={unit} />}
        getItemKey={(unit) => unit.id}
        onPrinted={handlePrinted}
      />
    </div>
  );
}
