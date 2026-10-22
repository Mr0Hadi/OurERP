import { Link } from "react-router-dom";

import PaymentTypeBadge from "@/shared/components/status/PaymentTypeBadge";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { ReservationTimer } from "../proforma/ReservationBadge";

/**
 * ستون‌های مشترکِ صف‌های پیش‌فاکتور (`SaleListDto`) — صفِ انبار و صندوق هر کدام آن‌هایی را که لازم دارند
 * برمی‌دارند. کلیدهای مرتب‌سازی همان `SALE_SORT_COLUMNS`اند؛ `meta.mobile` چیدمانِ کارتِ موبایل است.
 */
export const PROFORMA_QUEUE_COLUMNS = Object.freeze({
  customer: {
    accessorKey: "customerName",
    meta: { mobile: "title" },
    header: "مشتری",
    cell: ({ row }) => (
      <Link className="font-medium hover:underline" to={routeWithId(ROUTES.SALES_DETAIL, row.original.id)}>
        {row.original.customerName}
      </Link>
    ),
  },
  number: {
    id: "number",
    meta: { mobile: "subtitle" },
    header: "پیش‌فاکتور",
    enableSorting: false,
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">#{row.original.id}</span>,
  },
  paymentType: {
    accessorKey: "paymentType",
    header: "شیوه‌ی پرداخت",
    cell: (info) => <PaymentTypeBadge type={info.getValue()} />,
  },
  dueDate: {
    accessorKey: "paymentDate",
    header: "سررسید",
    cell: (info) => (
      <span className="tabular-nums text-sm">{info.getValue() ? gregorianToPersian(info.getValue()) : "—"}</span>
    ),
  },
  reservation: {
    id: "reservation",
    meta: { mobile: "badge" },
    header: "مهلتِ رزرو",
    enableSorting: false,
    cell: ({ row }) => (
      <ReservationTimer
        key={`${row.original.id}:${row.original.reservationSecondsLeft}`}
        secondsLeft={row.original.reservationSecondsLeft}
      />
    ),
  },
  warehouseIssues: {
    accessorKey: "openWarehouseIssueCount",
    meta: { mobile: "badge" },
    header: "گزارشِ باز",
    enableSorting: false,
    cell: (info) =>
      info.getValue() > 0 ? (
        <StatusBadge size="sm" tone="danger">
          {formatNumber(info.getValue())} دانه
        </StatusBadge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  /** مبلغی که مشتری می‌پردازد (اقساطی: با سود). */
  payable: {
    accessorKey: "totalAmount",
    meta: { mobile: "highlight" },
    header: "قابل پرداخت (ریال)",
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">
        {formatNumber(row.original.payableAmount ?? row.original.totalAmount)}
      </span>
    ),
  },
});

/**
 * ستونِ دکمه‌ی ردیف — بی‌برچسب تا در موبایل فوترِ کارت شود.
 * @param render `(sale) => ReactNode`
 */
export const queueActionColumn = (render) => ({
  id: "actions",
  header: "",
  enableSorting: false,
  cell: ({ row }) => render(row.original),
});
