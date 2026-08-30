// src/features/warehouse/units/components/UnitsTable.jsx
import { useMemo } from "react";
import { ChevronLeft, RotateCw } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import { Button } from "@/shared/components/ui/button";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

import UnitStatusBadge from "./UnitStatusBadge";
import UnitSelectCheckbox from "./UnitSelectCheckbox";

const getRowKey = (row) => row.original.id;

export default function UnitsTable({
  data,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
  onOpenUnit,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}) {
  const allOnPageSelected =
    data.length > 0 && data.every((unit) => selectedIds.has(unit.id));

  const columns = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <UnitSelectCheckbox
            checked={allOnPageSelected}
            onChange={() => onToggleSelectAll(data, !allOnPageSelected)}
            label="انتخاب همه‌ی این صفحه"
          />
        ),
        cell: (info) => (
          <UnitSelectCheckbox
            checked={selectedIds.has(info.row.original.id)}
            onChange={() => onToggleSelect(info.row.original.id)}
            label={`انتخاب ${info.row.original.barcode}`}
          />
        ),
      },
      {
        accessorKey: "barcode",
        header: "بارکد واحد",
        // شکلِ خوانا (با خط‌تیره) نمایش داده می‌شود، نه payload — همان
        // چیزی که زیرِ میله‌ها روی برچسب چاپ شده، تا انباردار بتواند
        // ردیفِ جدول را با برچسبِ توی دستش تطبیق بدهد.
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue()}</span>
        ),
      },
      {
        accessorKey: "serialNumber",
        header: "سریال",
        cell: (info) => (
          <span className="tabular-nums text-xs text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "productName",
        header: "کالا",
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-light">{info.getValue()}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {info.row.original.productCode}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "وضعیت",
        cell: (info) => <UnitStatusBadge status={info.getValue()} />,
      },
      {
        accessorKey: "createdAt",
        header: "تاریخ ساخت",
        cell: (info) => (
          <span className="text-xs tabular-nums">
            {info.getValue() ? gregorianToPersian(info.getValue().slice(0, 10)) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: (info) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="gap-1 px-2"
              onClick={() => onOpenUnit(info.row.original)}
            >
              جزئیات
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [
      onOpenUnit,
      selectedIds,
      onToggleSelect,
      onToggleSelectAll,
      data,
      allOnPageSelected,
    ],
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
      rowClassName={(row) =>
        selectedIds.has(row.original.id) ? "bg-primary/5" : ""
      }
      emptyMessage="واحدی با این فیلترها پیدا نشد."
    />
  );
}
