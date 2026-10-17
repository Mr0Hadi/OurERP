import DataTable from "@/shared/components/table/DataTable";
import { detailsColumn } from "@/shared/components/table/columns";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { gregorianToPersian, persianTimeOf } from "@/shared/lib/dateUtils";
import { formatDigits, formatNumber } from "@/shared/lib/numberFormat";
import AuditActionLabel from "./AuditActionLabel";

// ستون‌ها به هیچ state ای وابسته نیستند، پس یک بار بیرون از کامپوننت ساخته می‌شوند.
const COLUMNS = [
  {
    id: "occurredAt",
    accessorKey: "occurredAt",
    meta: { mobile: "subtitle" },
    header: "زمان",
    cell: ({ row }) => (
      <span className="inline-flex flex-col items-center whitespace-nowrap tabular-nums leading-5">
        <span className="text-sm">{gregorianToPersian(row.original.occurredAt)}</span>
        <span className="text-xs text-muted-foreground">{persianTimeOf(row.original.occurredAt)}</span>
      </span>
    ),
  },
  {
    id: "actionTitle",
    accessorKey: "actionTitle",
    meta: { mobile: "title" },
    header: "عملیات",
    cell: ({ row }) => <AuditActionLabel event={row.original} className="max-w-72 font-medium" />,
  },
  {
    id: "userName",
    accessorKey: "userName",
    meta: { mobile: "highlight" },
    header: "کاربر",
    cell: ({ row }) =>
      row.original.userName ? (
        <span className="whitespace-nowrap">{row.original.userName}</span>
      ) : (
        <span className="text-xs text-muted-foreground">بدون کاربر</span>
      ),
  },
  {
    id: "changeCount",
    accessorKey: "changeCount",
    header: "تغییرات",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{formatNumber(row.original.changeCount)} سطر</span>
    ),
  },
  {
    id: "id",
    accessorKey: "id",
    header: "شماره",
    enableSorting: false,
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">#{formatDigits(row.original.id)}</span>,
  },
  detailsColumn((event) => routeWithId(ROUTES.AUDIT_DETAIL, event.id)),
];

/** فهرستِ رویدادهای تاریخچه؛ صفحه‌بندی و مرتب‌سازی سمتِ سرور (props همان `DataTable`). */
export default function AuditEventTable(props) {
  return (
    <DataTable
      columns={COLUMNS}
      getRowKey={(row) => row.original.id}
      emptyMessage="رویدادی با این فیلترها ثبت نشده است."
      {...props}
    />
  );
}
