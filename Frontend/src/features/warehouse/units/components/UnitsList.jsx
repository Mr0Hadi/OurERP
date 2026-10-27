import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, PackageOpen, Tags } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import DataTablePagination from "@/shared/components/table/DataTablePagination";
import RefreshButton from "@/shared/components/table/RefreshButton";
import SortSelect from "@/shared/components/table/SortSelect";
import TableLoadingSkeleton from "@/shared/components/table/TableLoadingSkeleton";
import { Button } from "@/shared/components/ui/button";
import { UNIT_CUSTODY_REASON_LABELS } from "@/shared/domain/enums/unitStatus";

import {
  LABEL_FILTERS,
  UNIT_SEGMENTS,
} from "../domain/unitVocabulary";
import { DocumentKindEnum, documentRouteOf } from "@/shared/domain/enums/documentKind";
import { formatDigits } from "@/shared/lib/numberFormat";
import UnitStatusBadge from "./UnitStatusBadge";
import SelectCheckbox from "@/shared/components/forms/SelectCheckbox";
import EmptyState from "@/shared/components/feedback/EmptyState";
import { UnitLabelStateBadge, UnitQuarantineAge, UnitWhereabouts } from "./UnitCells";

/** کالا و بارکد در یک خانه؛ کلیک جزئیات و مسیرِ دانه را باز می‌کند. */
function UnitIdentity({ unit, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(unit)}
      className="group/id flex min-w-0 flex-col items-start gap-0.5 text-right"
    >
      <span className="max-w-full truncate text-sm font-medium group-hover/id:text-primary group-hover/id:underline">
        {unit.productName ?? "—"}
      </span>
      <span className="max-w-full truncate font-mono text-xs text-muted-foreground" dir="ltr">
        {unit.barcode}
      </span>
      <span className="text-[11px] text-muted-foreground tabular-nums">سریال {formatDigits(unit.serialNumber)}</span>
    </button>
  );
}

/** از کجا آمد: تامین‌کننده و فاکتورِ خرید؛ بدونِ خرید یعنی موجودیِ اولیه. */
function UnitOrigin({ unit }) {
  if (!unit.purchaseId) return <span className="text-xs text-muted-foreground">موجودی اولیه</span>;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm">{unit.supplierName ?? "—"}</span>
      <Link
        to={documentRouteOf(DocumentKindEnum.PURCHASE, unit.purchaseId)}
        className="font-mono text-[11px] text-muted-foreground hover:text-primary hover:underline"
      >
        {unit.purchaseInvoiceNumber || `#${unit.purchaseId}`}
      </Link>
    </div>
  );
}

/** علت و مدتِ قرنطینه — ستونِ «منشأ» در جایگاهِ قرنطینه. */
function QuarantineInfo({ unit }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm">{UNIT_CUSTODY_REASON_LABELS[unit.custodyReason] ?? "دریافت خرید"}</span>
      <UnitQuarantineAge unit={unit} />
    </div>
  );
}

/**
 * یک دکمه برای هر ردیف: جزئیات، که همه‌ی کارهای همان دانه هم آنجاست. کارِ
 * روی چند دانه با انتخاب و نوارِ پایینِ صفحه — تکی و دسته‌ای یک مسیر دارند.
 */
function OpenButton({ unit, onOpen }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1 text-xs"
      onClick={() => onOpen(unit)}
    >
      جزئیات
      <ChevronLeft className="h-3.5 w-3.5" />
    </Button>
  );
}

/** کارتِ یک دانه در عرضِ کم — همان اطلاعاتِ ردیف، فشرده. */
function UnitCard({ unit, isQuarantine, selected, onToggleSelect, onOpen }) {
  return (
    <li
      className={`rounded-xl border p-3 transition-colors ${
        selected ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-1">
        <div className="-ms-2 -mt-1.5">
          <SelectCheckbox
            checked={selected}
            onChange={() => onToggleSelect(unit)}
            label={`انتخاب ${unit.barcode}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <UnitIdentity unit={unit} onOpen={onOpen} />
        </div>
        <UnitStatusBadge status={unit.status} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 border-t border-dashed border-border pt-2 text-xs">
        {isQuarantine ? <QuarantineInfo unit={unit} /> : <UnitWhereabouts unit={unit} />}
        <UnitOrigin unit={unit} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <UnitLabelStateBadge unit={unit} compact />
        <div className="ms-auto">
          <OpenButton unit={unit} onOpen={onOpen} />
        </div>
      </div>
    </li>
  );
}

function UnitsEmptyState({ segment, labelFilter, hasFilters, onClearFilters }) {
  const allLabeled = labelFilter === LABEL_FILTERS.UNPRINTED;
  const Icon = allLabeled ? Tags : PackageOpen;
  const title = allLabeled
    ? "همه برچسب خورده‌اند"
    : hasFilters
      ? "دانه‌ای با این فیلترها پیدا نشد"
      : segment === UNIT_SEGMENTS.QUARANTINE
        ? "قرنطینه خالی است"
        : "دانه‌ای اینجا نیست";
  const hint = allLabeled
    ? "دانه‌ی بدونِ برچسبی در این جایگاه نمانده."
    : hasFilters
      ? "فیلترها یا جست‌وجو را تغییر دهید."
      : null;

  return (
    <EmptyState
      icon={Icon}
      title={title}
      description={hint}
      action={
        hasFilters && (
          <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
            پاک کردن فیلترها
          </Button>
        )
      }
    />
  );
}

/**
 * فهرستِ دانه‌ها: در عرضِ کافی جدول با مرتب‌سازیِ سرور، در عرضِ کم کارت.
 * چیدمان به عرضِ خودِ کارتِ صفحه واکنش نشان می‌دهد (container query)، نه
 * به پنجره — سایدبارِ باز هم حساب می‌شود.
 *
 * ستون‌ها: «دانه» (کالا، بارکد، سریال)، «کجاست»، «منشأ» (در قرنطینه: علت و
 * مدت)، «برچسب» و «جزئیات». کارها (تکی یا دسته‌ای) با انتخاب یا از جزئیات.
 */
export default function UnitsList({
  units,
  segment,
  labelFilter,
  hasFilters,
  onClearFilters,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
  refresh,
  selectedIds,
  onToggleSelect,
  onOpenUnit,
}) {
  const isQuarantine = segment === UNIT_SEGMENTS.QUARANTINE;

  const columns = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        // گوشه‌ی سرتیتر جای «تازه‌سازی» است؛ انتخابِ گروهی با «انتخاب همه‌ی دانه‌ها»ی بالای فهرست.
        header: () => <RefreshButton query={refresh} variant="header" />,
        cell: ({ row }) => (
          <SelectCheckbox
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleSelect(row.original)}
            label={`انتخاب ${row.original.barcode}`}
          />
        ),
      },
      {
        accessorKey: "productName",
        header: "دانه",
        cell: ({ row }) => <UnitIdentity unit={row.original} onOpen={onOpenUnit} />,
      },
      {
        accessorKey: "status",
        header: "کجاست",
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <UnitStatusBadge status={row.original.status} />
            <UnitWhereabouts unit={row.original} detailOnly />
          </div>
        ),
      },
      isQuarantine
        ? {
            accessorKey: "quarantinedAt",
            header: "علت و مدت",
            cell: ({ row }) => <QuarantineInfo unit={row.original} />,
          }
        : {
            id: "origin",
            header: "منشأ",
            enableSorting: false,
            cell: ({ row }) => <UnitOrigin unit={row.original} />,
          },
      {
        accessorKey: "lastPrintedAt",
        header: "برچسب",
        cell: ({ row }) => <UnitLabelStateBadge unit={row.original} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <OpenButton unit={row.original} onOpen={onOpenUnit} />
          </div>
        ),
      },
    ],
    [refresh, selectedIds, isQuarantine, onToggleSelect, onOpenUnit],
  );

  // همان ستون‌هایی که سرتیترشان در دسکتاپ کلیک‌خور است.
  const sortOptions = columns
    .filter((column) => column.enableSorting !== false && typeof column.header === "string")
    .map((column) => ({ id: column.accessorKey ?? column.id, label: column.header }));

  const empty = (
    <UnitsEmptyState
      segment={segment}
      labelFilter={labelFilter}
      hasFilters={hasFilters}
      onClearFilters={onClearFilters}
    />
  );

  // بی‌ردیف سرتیتری نیست که دکمه را نگه دارد.
  const emptyWithRefresh = (
    <div className="space-y-2">
      <div className="flex justify-end">
        <RefreshButton query={refresh} />
      </div>
      {empty}
    </div>
  );

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
          getRowKey={(row) => row.original.id}
          rowClassName={(row) => (selectedIds.has(row.original.id) ? "bg-primary/5" : "")}
          emptyState={emptyWithRefresh}
        />
      </div>

      <div className="space-y-3 @3xl/units:hidden">
        {isLoading ? (
          <TableLoadingSkeleton cards />
        ) : (
          <>
            {/* همان نوارِ بالای کارت‌های `MobileRowCards`. */}
            <div className="flex min-h-8 items-center justify-end gap-1.5">
              <SortSelect options={sortOptions} sorting={sorting} onChange={onSortingChange} />
              <RefreshButton query={refresh} variant="pill" />
            </div>
            {units.length === 0 ? (
              empty
            ) : (
              <>
                <ul className="space-y-2">
                  {units.map((unit) => (
                    <UnitCard
                      key={unit.id}
                      unit={unit}
                      isQuarantine={isQuarantine}
                      selected={selectedIds.has(unit.id)}
                      onToggleSelect={onToggleSelect}
                      onOpen={onOpenUnit}
                    />
                  ))}
                </ul>
                <DataTablePagination
                  totalPages={totalPages}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPaginationChange={onPaginationChange}
                  compact
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
