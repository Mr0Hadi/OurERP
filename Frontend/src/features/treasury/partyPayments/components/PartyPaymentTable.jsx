import { Link } from "react-router-dom";

import DataTable from "@/shared/components/table/DataTable";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { DIRECTION_SHORT_LABELS } from "../domain/partyPayment";

const COLUMNS = [
  {
    accessorKey: "partyName",
    meta: { mobile: "title" },
    header: "طرف حساب",
    cell: ({ row }) => (
      <Link
        to={routeWithId(ROUTES.TREASURY_PARTY_PAYMENTS_DETAIL, row.original.id)}
        className="font-medium text-primary hover:underline"
      >
        {row.original.partyName}
      </Link>
    ),
  },
  {
    accessorKey: "paidAt",
    meta: { mobile: "subtitle" },
    header: "تاریخ",
    cell: (info) => <span className="tabular-nums text-sm">{gregorianToPersian(info.getValue())}</span>,
  },
  {
    accessorKey: "direction",
    meta: { mobile: "badge" },
    header: "جهت",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.voidedAt ? (
        <StatusBadge tone="neutral">ابطال‌شده</StatusBadge>
      ) : (
        <StatusBadge tone={row.original.direction === PaymentDirectionEnum.IN ? "success" : "info"}>
          {DIRECTION_SHORT_LABELS[row.original.direction]}
        </StatusBadge>
      ),
  },
  {
    accessorKey: "amount",
    meta: { mobile: "highlight" },
    header: "مبلغ (ریال)",
    cell: (info) => <span className="font-medium tabular-nums">{formatNumber(info.getValue())}</span>,
  },
  {
    accessorKey: "unallocatedAmount",
    header: "تخصیص‌نیافته",
    cell: ({ row }) =>
      row.original.canAllocate && Number(row.original.unallocatedAmount) > 0 ? (
        <span className="tabular-nums">{formatNumber(row.original.unallocatedAmount)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "type",
    header: "روش",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs">
        {[PAYMENT_TYPE_LABELS[row.original.type], row.original.bankAccountTitle].filter(Boolean).join(" · ")}
      </span>
    ),
  },
];

/** فهرستِ دریافت/پرداخت‌های علی‌الحساب (`ServerTable`؛ صفحه‌بندی و مرتب‌سازی سمتِ سرور). */
export default function PartyPaymentTable(tableProps) {
  return (
    <DataTable
      {...tableProps}
      columns={COLUMNS}
      getRowKey={(row) => row.original.id}
      rowClassName={({ original }) => (original.voidedAt ? "text-muted-foreground" : "")}
      emptyMessage="دریافت یا پرداختِ علی‌الحسابی با این فیلترها یافت نشد."
    />
  );
}
