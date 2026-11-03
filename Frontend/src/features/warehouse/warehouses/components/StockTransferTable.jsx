import { ArrowLeft } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import { detailsColumn } from "@/shared/components/table/columns";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { STOCK_TRANSFER_STATUS_LABELS, STOCK_TRANSFER_STATUS_TONES } from "@/shared/domain/enums/stockTransfer";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";

/** «مبدأ ← مقصد» در یک خط؛ در RTL پیکان به چپ یعنی به سوی مقصد. */
export function TransferRoute({ transfer, className }) {
  return (
    <span className={className}>
      {transfer.fromWarehouseName}
      <ArrowLeft className="mx-1 inline size-3.5 align-[-2px] text-muted-foreground" aria-label="به" />
      {transfer.toWarehouseName}
    </span>
  );
}

const COLUMNS = [
  {
    accessorKey: "transferNumber",
    meta: { mobile: "title" },
    header: "شماره",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium" dir="ltr">
        {row.original.transferNumber}
      </span>
    ),
  },
  {
    id: "route",
    meta: { mobile: "subtitle" },
    header: "مبدأ ← مقصد",
    enableSorting: false,
    cell: ({ row }) => <TransferRoute transfer={row.original} className="text-sm" />,
  },
  {
    accessorKey: "status",
    meta: { mobile: "badge" },
    header: "وضعیت",
    cell: ({ row }) => (
      <StatusBadge tone={STOCK_TRANSFER_STATUS_TONES[row.original.status]}>
        {STOCK_TRANSFER_STATUS_LABELS[row.original.status] ?? row.original.statusTitle}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "totalUnits",
    meta: { mobile: "highlight" },
    header: "دانه",
    enableSorting: false,
    cell: (info) => <span className="tabular-nums text-sm">{formatNumber(info.getValue())}</span>,
  },
  {
    accessorKey: "dispatchedAt",
    header: "ارسال",
    cell: (info) => <span className="tabular-nums text-sm">{gregorianToPersianDateTime(info.getValue())}</span>,
  },
  detailsColumn((row) => routeWithId(ROUTES.WAREHOUSE_TRANSFERS_DETAIL, row.id)),
];

/** فهرستِ حواله‌ها (`ServerTable`؛ صفحه‌بندی و مرتب‌سازی سمتِ سرور). */
export default function StockTransferTable(tableProps) {
  return (
    <DataTable
      {...tableProps}
      columns={COLUMNS}
      getRowKey={(row) => row.original.id}
      emptyMessage="حواله‌ای با این فیلترها یافت نشد."
    />
  );
}
