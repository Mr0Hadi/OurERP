import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import DataTablePagination from "@/shared/components/table/DataTablePagination";
import TableLoadingSkeleton from "@/shared/components/table/TableLoadingSkeleton";
import { Button } from "@/shared/components/ui/button";
import { UNIT_CUSTODY_REASON_LABELS } from "@/shared/domain/enums/unitStatus";

import { UNIT_VIEWS, formatDate } from "../domain/unitVocabulary";
import UnitStatusBadge from "./UnitStatusBadge";
import UnitSelectCheckbox from "./UnitSelectCheckbox";
import {
  UnitBarcodeCell,
  UnitProductCell,
  UnitWhereabouts,
  UnitLabelStateBadge,
  UnitQuarantineAge,
  UnitQuarantineSource,
  UnitValueCell,
} from "./UnitCells";

const getRowKey = (row) => row.original.id;

function StatusCell({ unit }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <UnitStatusBadge status={unit.status} />
      {unit.custodyReason && (
        <span className="text-[11px] text-muted-foreground">
          {UNIT_CUSTODY_REASON_LABELS[unit.custodyReason]}
        </span>
      )}
    </div>
  );
}

function OriginCell({ unit }) {
  if (!unit.purchaseId) {
    return <span className="text-xs text-muted-foreground">موجودی اولیه / اصلاح</span>;
  }
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xs">{unit.purchaseInvoiceNumber || unit.purchaseId}</span>
      {unit.supplierName && (
        <span className="text-[11px] text-muted-foreground">{unit.supplierName}</span>
      )}
    </div>
  );
}

/**
 * ستون‌های هر تب. ستون‌های مشترک (انتخاب، بارکد، کالا، جزئیات) همیشه
 * هستند؛ وسطِ جدول به کارِ همان تب می‌پردازد:
 *  - همه: وضعیت، کجاست، برچسب.
 *  - قرنطینه: علت، چند روز، سندِ منشأ، ارزشِ نگه‌داشته.
 *  - صفِ چاپ: وضعیت، تاریخِ ورود، خرید — تا برچسب‌های یک دریافت کنار هم چاپ شوند.
 *
 * ستونِ قابلِ مرتب‌سازی `accessorKey` دارد (TanStack بدونِ accessor مرتب
 * نمی‌کند)؛ نامش همان کلیدِ `UNIT_SORT_COLUMNS` است که به سرور می‌رود.
 */
function viewColumns(view) {
  if (view === UNIT_VIEWS.QUARANTINE) {
    return [
      {
        id: "custodyReason",
        header: "علت",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm">
            {UNIT_CUSTODY_REASON_LABELS[row.original.custodyReason] ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "quarantinedAt",
        header: "در قرنطینه",
        cell: ({ row }) => <UnitQuarantineAge unit={row.original} />,
      },
      {
        id: "quarantineSource",
        header: "سند",
        enableSorting: false,
        cell: ({ row }) => <UnitQuarantineSource unit={row.original} />,
      },
      {
        id: "quarantineCost",
        header: "ارزش (ریال)",
        enableSorting: false,
        cell: ({ row }) => <UnitValueCell value={row.original.quarantineCost} />,
      },
    ];
  }
  if (view === UNIT_VIEWS.UNLABELED) {
    return [
      {
        accessorKey: "status",
        header: "وضعیت",
        cell: ({ row }) => <StatusCell unit={row.original} />,
      },
      {
        accessorKey: "createdAt",
        header: "ورود به انبار",
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "origin",
        header: "خرید",
        enableSorting: false,
        cell: ({ row }) => <OriginCell unit={row.original} />,
      },
    ];
  }
  return [
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => <StatusCell unit={row.original} />,
    },
    {
      id: "whereabouts",
      header: "کجاست",
      enableSorting: false,
      cell: ({ row }) => <UnitWhereabouts unit={row.original} />,
    },
    {
      accessorKey: "lastPrintedAt",
      header: "برچسب",
      cell: ({ row }) => <UnitLabelStateBadge unit={row.original} />,
    },
  ];
}

/** کارتِ یک دانه برای عرضِ کم — همان اطلاعاتِ ردیف، بدونِ اسکرولِ افقی. */
function UnitCard({ unit, view, selected, onToggleSelect, onOpen }) {
  return (
    <li
      className={`flex items-start gap-2 rounded-lg border p-3 ${
        selected ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <UnitSelectCheckbox
        checked={selected}
        onChange={() => onToggleSelect(unit)}
        label={`انتخاب ${unit.barcode}`}
      />
      <button
        type="button"
        onClick={() => onOpen(unit)}
        className="flex min-w-0 flex-1 flex-col gap-2 text-start"
      >
        <div className="flex items-start justify-between gap-2">
          <UnitProductCell unit={unit} />
          <UnitStatusBadge status={unit.status} />
        </div>
        <UnitBarcodeCell unit={unit} />
        <div className="flex flex-wrap items-end justify-between gap-2">
          {view === UNIT_VIEWS.QUARANTINE ? (
            <>
              <span className="text-xs">
                {UNIT_CUSTODY_REASON_LABELS[unit.custodyReason] ?? "—"}
              </span>
              <UnitQuarantineAge unit={unit} />
            </>
          ) : (
            <>
              <UnitWhereabouts unit={unit} />
              <UnitLabelStateBadge unit={unit} />
            </>
          )}
        </div>
      </button>
    </li>
  );
}

/**
 * فهرستِ دانه‌ها: در عرضِ کافی جدول با مرتب‌سازیِ سرور، در عرضِ کم کارت.
 * چیدمان به عرضِ خودِ کارتِ صفحه واکنش نشان می‌دهد (container query)،
 * نه به عرضِ پنجره — سایدبارِ باز هم حساب می‌شود.
 */
export default function UnitsList({
  units,
  view,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenUnit,
}) {
  const allOnPageSelected =
    units.length > 0 && units.every((unit) => selectedIds.has(unit.id));

  const columns = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <UnitSelectCheckbox
            checked={allOnPageSelected}
            onChange={() => onToggleSelectAll(units, !allOnPageSelected)}
            label="انتخاب همه‌ی این صفحه"
          />
        ),
        cell: ({ row }) => (
          <UnitSelectCheckbox
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleSelect(row.original)}
            label={`انتخاب ${row.original.barcode}`}
          />
        ),
      },
      {
        accessorKey: "serialNumber",
        header: "بارکد / سریال",
        cell: ({ row }) => <UnitBarcodeCell unit={row.original} />,
      },
      {
        accessorKey: "productName",
        header: "کالا",
        cell: ({ row }) => <UnitProductCell unit={row.original} />,
      },
      ...viewColumns(view),
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="gap-1 px-2"
              onClick={() => onOpenUnit(row.original)}
            >
              جزئیات
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [view, units, selectedIds, allOnPageSelected, onToggleSelect, onToggleSelectAll, onOpenUnit],
  );

  const emptyMessage =
    view === UNIT_VIEWS.UNLABELED
      ? "همه‌ی دانه‌های انبار برچسب خورده‌اند."
      : view === UNIT_VIEWS.QUARANTINE
        ? "قرنطینه خالی است."
        : "دانه‌ای با این فیلترها پیدا نشد.";

  return (
    <div className="@container/units">
      <div className="hidden @3xl/units:block">
        <DataTable
          data={units}
          columns={columns}
          isLoading={isLoading}
          totalPages={totalPages}
          currentPage={currentPage}
          pageSize={pageSize}
          onPaginationChange={onPaginationChange}
          sorting={sorting}
          onSortingChange={onSortingChange}
          getRowKey={getRowKey}
          rowClassName={(row) => (selectedIds.has(row.original.id) ? "bg-primary/5" : "")}
          emptyMessage={emptyMessage}
        />
      </div>

      <div className="space-y-3 @3xl/units:hidden">
        {isLoading ? (
          <TableLoadingSkeleton />
        ) : units.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <UnitSelectCheckbox
                checked={allOnPageSelected}
                onChange={() => onToggleSelectAll(units, !allOnPageSelected)}
                label="انتخاب همه‌ی این صفحه"
              />
              همه‌ی این صفحه
            </div>
            <ul className="space-y-2">
              {units.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  view={view}
                  selected={selectedIds.has(unit.id)}
                  onToggleSelect={onToggleSelect}
                  onOpen={onOpenUnit}
                />
              ))}
            </ul>
          </>
        )}
        <DataTablePagination
          totalPages={totalPages}
          currentPage={currentPage}
          pageSize={pageSize}
          onPaginationChange={onPaginationChange}
        />
      </div>
    </div>
  );
}
