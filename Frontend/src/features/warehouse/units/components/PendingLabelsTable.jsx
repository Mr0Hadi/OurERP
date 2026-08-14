// src/features/warehouse/units/components/PendingLabelsTable.jsx
import { useMemo, useState } from "react";
import { Tags } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import { Button } from "@/shared/components/ui/button";

import { getRowStatus, ROW_STATUS_CONFIG } from "./labelRowStatus";

const getRowKey = (row) => row.original.productId;

/**
 * سقف تعداد برچسبِ قابل ساخت در یک نوبت. کمبود واقعی معمولاً کوچک
 * است؛ این فقط جلوی خطای تایپی («۱۰۰۰ به‌جای ۱۰») را می‌گیرد.
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
            <div className="flex items-center gap-2">
              <ProductThumb item={{ image: row.image, productName: row.productName }} />
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
        cell: (info) => (
          <span className="tabular-nums">{info.getValue()}</span>
        ),
      },
      {
        accessorKey: "labeledCount",
        header: "برچسب‌خورده",
        cell: (info) => (
          <span className="tabular-nums">{info.getValue()}</span>
        ),
      },
      {
        accessorKey: "missingCount",
        header: "بدون برچسب",
        cell: (info) => (
          <span className="tabular-nums font-medium">{info.getValue()}</span>
        ),
      },
      {
        id: "status",
        header: "وضعیت",
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const status = getRowStatus(row.stock, row.labeledCount);
          const config = ROW_STATUS_CONFIG[status];
          const Icon = config.icon;
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap ${config.badgeClass}`}
            >
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "ساخت برچسب",
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const qty = quantityFor(row);
          return (
            <div className="flex items-center justify-end gap-2">
              <QuantityStepper
                value={qty}
                max={MAX_BATCH}
                size="sm"
                onChange={(next) =>
                  setQuantities((prev) => ({ ...prev, [row.productId]: next }))
                }
              />
              <Button
                type="button"
                size="sm"
                className="gap-1.5 shrink-0"
                disabled={qty <= 0 || pendingProductId === row.productId}
                onClick={() => onGenerate(row, qty)}
              >
                <Tags className="w-3.5 h-3.5" />
                {pendingProductId === row.productId ? "..." : "تولید و چاپ"}
              </Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quantities, onGenerate, pendingProductId],
  );

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
      emptyMessage="همه‌ی کالاها به‌اندازه‌ی موجودی‌شان برچسب دارند."
    />
  );
}
