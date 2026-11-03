import DataTable from "@/shared/components/table/DataTable";
import { detailsColumn } from "@/shared/components/table/columns";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { STOCKTAKE_STATUS_LABELS, STOCKTAKE_STATUS_TONES } from "@/shared/domain/enums/stocktake";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import StocktakeScopeText from "./StocktakeScopeText";

const COLUMNS = [
  {
    accessorKey: "number",
    meta: { mobile: "title" },
    header: "شماره",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium" dir="ltr">
        {row.original.number}
      </span>
    ),
  },
  {
    accessorKey: "title",
    meta: { mobile: "subtitle" },
    header: "عنوان",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.original.title}</p>
        <StocktakeScopeText stocktake={row.original} className="block truncate text-xs text-muted-foreground" />
      </div>
    ),
  },
  {
    accessorKey: "status",
    meta: { mobile: "badge" },
    header: "وضعیت",
    cell: ({ row }) => (
      <StatusBadge tone={STOCKTAKE_STATUS_TONES[row.original.status]}>
        {STOCKTAKE_STATUS_LABELS[row.original.status] ?? row.original.statusTitle}
      </StatusBadge>
    ),
  },
  {
    id: "progress",
    meta: { mobile: "highlight" },
    header: "شمرده‌شده",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">
        {formatNumber(row.original.countedLineCount)} از {formatNumber(row.original.lineCount)} کالا
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "تاریخ ساخت",
    cell: (info) => <span className="tabular-nums text-sm">{gregorianToPersianDateTime(info.getValue())}</span>,
  },
  detailsColumn((row) => routeWithId(ROUTES.WAREHOUSE_STOCKTAKE_DETAIL, row.id)),
];

/** فهرستِ انبارگردانی‌ها (`ServerTable`؛ صفحه‌بندی و مرتب‌سازی سمتِ سرور). */
export default function StocktakeTable(tableProps) {
  return (
    <DataTable
      {...tableProps}
      columns={COLUMNS}
      getRowKey={(row) => row.original.id}
      emptyMessage="انبارگردانی‌ای با این فیلترها یافت نشد."
    />
  );
}
