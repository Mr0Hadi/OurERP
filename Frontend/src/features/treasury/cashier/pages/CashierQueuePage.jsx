import { RefreshCw, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

import ProformaQueueFilters from "@/features/sales/orders/components/table/ProformaQueueFilters";
import {
  useProformaQueueFilters,
  useProformaQueueQuery,
} from "@/features/sales/orders/services/queries";
import { createProformaQueueFilterStore } from "@/features/sales/orders/store/proformaQueueFilterStore";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import PaymentTypeBadge from "@/shared/components/status/PaymentTypeBadge";
import DataTable from "@/shared/components/table/DataTable";
import ServerTable from "@/shared/components/table/ServerTable";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import ReservationTimer from "../components/ReservationTimer";

/** فیلترهای صفِ صندوق (جدا از صفِ انبار). */
const useCashierFilterStore = createProformaQueueFilterStore();

const COLUMNS = [
  {
    accessorKey: "customerName",
    meta: { mobile: "title" },
    header: "مشتری",
    cell: ({ row }) => (
      <Link
        className="font-medium hover:underline"
        to={routeWithId(ROUTES.SALES_DETAIL, row.original.id)}
      >
        {row.original.customerName}
      </Link>
    ),
  },
  {
    id: "number",
    meta: { mobile: "subtitle" },
    header: "پیش‌فاکتور",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        #{row.original.id}
      </span>
    ),
  },
  {
    accessorKey: "paymentType",
    header: "شیوه‌ی پرداخت",
    cell: (info) => <PaymentTypeBadge type={info.getValue()} />,
  },
  {
    accessorKey: "paymentDate",
    header: "سررسید",
    cell: (info) => (
      <span className="tabular-nums text-sm">
        {info.getValue() ? gregorianToPersian(info.getValue()) : "—"}
      </span>
    ),
  },
  {
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
  {
    accessorKey: "totalAmount",
    meta: { mobile: "highlight" },
    header: "قابل پرداخت (ریال)",
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">
        {formatNumber(row.original.payableAmount ?? row.original.totalAmount)}
      </span>
    ),
  },
  {
    id: "actions",
    // بی‌برچسب: در موبایل فوترِ کارت می‌شود.
    header: "",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.reservationSecondsLeft === 0 ? (
        <span className="text-xs text-muted-foreground">مهلت تمام شد</span>
      ) : (
        <Button asChild size="sm" className="w-full gap-1 md:w-auto">
          <Link
            to={routeWithId(ROUTES.TREASURY_CASHIER_DETAIL, row.original.id)}
          >
            <Wallet className="size-4" />
            دریافت
          </Link>
        </Button>
      ),
  },
];

function CashierTable(props) {
  return (
    <DataTable
      {...props}
      columns={COLUMNS}
      emptyMessage="پیش‌فاکتوری منتظرِ پرداخت نیست."
    />
  );
}

/**
 * صفِ صندوق: پیش‌فاکتورهایی که انبار تأیید کرده (یا در فروشِ حضوری رزرو شده) و منتظرِ پولِ مشتری‌اند.
 * هر ردیف صفحه‌ی دریافتِ خودش را باز می‌کند (`CashierPaymentPage`) که فاکتور را صادر می‌کند؛ فهرست هر ۳۰ ثانیه تازه می‌شود.
 */
export default function CashierQueuePage() {
  const listState = useCashierFilterStore();
  const filters = useProformaQueueFilters(useCashierFilterStore);
  const query = useProformaQueueQuery(
    SaleProformaStageEnum.WAREHOUSE_CHECKED,
    filters,
    listState.pagination,
    listState.sorting,
  );

  return (
    <ListPageLayout
      title="صندوق"
      icon={Wallet}
      description="پیش‌فاکتورهای آماده‌ی پرداخت، با مهلتِ رزروِ کالا. با اولین دریافت فاکتور صادر می‌شود."
      actions={
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          aria-label="تازه‌سازی"
          title="تازه‌سازی"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw
            className={query.isFetching ? "size-4 animate-spin" : "size-4"}
          />
        </Button>
      }
    >
      <ProformaQueueFilters useStore={useCashierFilterStore} />
      <ServerTable query={query} listState={listState} table={CashierTable} />
    </ListPageLayout>
  );
}
