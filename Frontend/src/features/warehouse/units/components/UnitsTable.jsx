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
            label={`انتخاب ${info.row.original.unitCode}`}
          />
        ),
      },
      {
        accessorKey: "unitCode",
        header: "کد واحد",
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue()}</span>
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
        accessorKey: "firstPrintedAt",
        header: "چاپ",
        cell: (info) => {
          const firstPrintedAt = info.getValue();
          const { printCount } = info.row.original;

          if (!firstPrintedAt) {
            return (
              <span className="text-xs text-muted-foreground">چاپ‌نشده</span>
            );
          }

          return (
            <span className="flex items-center gap-1.5 text-xs tabular-nums">
              {gregorianToPersian(firstPrintedAt.slice(0, 10))}
              {printCount > 1 ? (
                <span
                  className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  title={`${printCount} بار چاپ شده`}
                >
                  <RotateCw className="h-2.5 w-2.5" />
                  {printCount}×
                </span>
              ) : null}
            </span>
          );
        },
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
