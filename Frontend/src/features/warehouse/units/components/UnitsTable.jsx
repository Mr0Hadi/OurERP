// src/features/warehouse/units/components/UnitsTable.jsx
import { useMemo } from "react";
import { Printer } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import { Button } from "@/shared/components/ui/button";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

import UnitStatusBadge from "./UnitStatusBadge";

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
  onReprint,
}) {
  const columns = useMemo(
    () => [
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
        accessorKey: "printedAt",
        header: "چاپ",
        cell: (info) => {
          const printedAt = info.getValue();
          if (!printedAt) {
            return (
              <span className="text-xs text-muted-foreground">چاپ‌نشده</span>
            );
          }
          return (
            <span className="text-xs tabular-nums">
              {gregorianToPersian(printedAt.slice(0, 10))}
              {info.row.original.printCount > 1
                ? ` (${info.row.original.printCount}×)`
                : ""}
            </span>
          );
        },
      },
      {
        id: "source",
        header: "منشأ",
        enableSorting: false,
        cell: (info) => (
          <span className="font-mono text-[11px] text-muted-foreground">
            {info.row.original.source?.refNumber || "—"}
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
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onReprint(info.row.original)}
            >
              <Printer className="w-3.5 h-3.5" />
              چاپ
            </Button>
          </div>
        ),
      },
    ],
    [onReprint],
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
      emptyMessage="هنوز واحدی ساخته نشده است."
    />
  );
}
