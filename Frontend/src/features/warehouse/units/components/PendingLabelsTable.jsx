// src/features/warehouse/units/components/PendingLabelsTable.jsx
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import { Button } from "@/shared/components/ui/button";

import { getRowStatus, ROW_STATUS_CONFIG } from "./labelRowStatus";

const getRowKey = (row) => row.original.productId;

/**
 * سقف تعداد برچسبِ قابل ساخت در یک نوبت — جلوی خطای تایپی را می‌گیرد.
 */
const MAX_BATCH = 200;

export default function PendingLabelsTable({
  data,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
  onGenerate,
  pendingProductId,
}) {
  const [quantities, setQuantities] = useState({});

  const quantityFor = (row) =>
    quantities[row.productId] ?? Math.min(row.missingCount, MAX_BATCH);

  const columns = useMemo(
    () => [
      {
        accessorKey: "productName",
        header: "کالا",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-3">
              <ProductThumb
                item={{ image: row.image, productName: row.productName }}
              />
              <div className="flex flex-col">
                <span className="font-light">{row.productName}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {row.productCode}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "stock",
        header: "موجودی",
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
      },
      {
        accessorKey: "labeledCount",
        header: "برچسب‌خورده",
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
      },
      {
        accessorKey: "missingCount",
        header: "بدون برچسب",
        cell: (info) => {
          const row = info.row.original;
          const config = ROW_STATUS_CONFIG[getRowStatus(row.stock, row.labeledCount)];
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm font-medium tabular-nums ${config.badgeClass}`}
            >
              {info.getValue()}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "ساخت و چاپ برچسب",
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const qty = quantityFor(row);
          const isBusy = pendingProductId === row.productId;

          return (
            <div className="flex items-center justify-end gap-2">
              <QuantityStepper
                value={qty}
                max={MAX_BATCH}
                onChange={(next) =>
                  setQuantities((prev) => ({ ...prev, [row.productId]: next }))
                }
              />
              <Button
                type="button"
                size="lg"
                className="shrink-0 gap-2 min-w-[9.5rem]"
                disabled={qty <= 0 || isBusy}
                onClick={() => onGenerate(row, qty)}
              >
                <Printer className="h-4 w-4" />
                {isBusy ? "در حال ساخت…" : `چاپ ${qty} برچسب`}
              </Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quantities, onGenerate, pendingProductId],
  );

  // ردیف‌هایی که کار دارند باید از یک متر آن‌طرف‌تر پیدا باشند.
  const rowClassName = (row) =>
    ROW_STATUS_CONFIG[
      getRowStatus(row.original.stock, row.original.labeledCount)
    ].rowClass;

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      totalPages={totalPages}
      currentPage={currentPage}
      pageSize={pageSize}
      onPaginationChange={onPaginationChange}
      sorting={sorting}
      onSortingChange={onSortingChange}
      getRowKey={getRowKey}
      rowClassName={rowClassName}
      emptyMessage="همه‌ی کالاها به‌اندازه‌ی موجودی‌شان برچسب دارند."
    />
  );
}
