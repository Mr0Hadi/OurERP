import { Wallet } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useCustomersOptionsQuery } from "@/features/customers/services/queries";
import { useProformaQueueQuery } from "@/features/sales/orders/services/queries";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import DataTable from "@/shared/components/table/DataTable";
import ServerTable from "@/shared/components/table/ServerTable";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { formatNumber } from "@/shared/lib/numberFormat";
import CashierPaymentDialog from "../components/CashierPaymentDialog";
import ReservationTimer from "../components/ReservationTimer";
import { useCashierFilterStore } from "../store/cashierFilterStore";

function columns(onPay) {
  return [
    {
      accessorKey: "customerName",
      meta: { mobile: "title" },
      header: "مشتری",
      cell: ({ row }) => (
        <Link className="hover:underline" to={routeWithId(ROUTES.SALES_DETAIL, row.original.id)}>
          {row.original.customerName}
        </Link>
      ),
    },
    {
      accessorKey: "totalAmount",
      meta: { mobile: "highlight" },
      header: "قابل پرداخت (ریال)",
      cell: ({ row }) => (
        <span className="tabular-nums">{formatNumber(row.original.payableAmount ?? row.original.totalAmount)}</span>
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
      id: "actions",
      header: "عملیات",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Button size="sm" className="gap-1" onClick={() => onPay(row.original.id)}>
            <Wallet className="size-4" />
            دریافت
          </Button>
        </div>
      ),
    },
  ];
}

/**
 * صفِ صندوق: پیش‌فاکتورهایی که انبار تأیید و رزرو کرده و منتظرِ پولِ مشتری‌اند. صندوقدار از همین‌جا
 * دریافت را ثبت می‌کند (فاکتور صادر می‌شود)؛ پیش‌فاکتوری که مشتری نخواست از صفحه‌ی خودش حذف می‌شود.
 */
export default function CashierQueuePage() {
  const listState = useCashierFilterStore();
  const filters = useDebouncedFilters(useCashierFilterStore, { text: [], instant: ["customerId"] });
  const query = useProformaQueueQuery(
    SaleProformaStageEnum.WAREHOUSE_CHECKED,
    filters,
    listState.pagination,
    listState.sorting,
  );
  const { customers, isLoading } = useCustomersOptionsQuery();
  const [payingId, setPayingId] = useState(null);

  const [Table] = useState(() => {
    const tableColumns = columns(setPayingId);
    return function CashierTable(props) {
      return <DataTable {...props} columns={tableColumns} emptyMessage="پیش‌فاکتوری منتظرِ پرداخت نیست." />;
    };
  });

  return (
    <ListPageLayout
      title="صندوق"
      icon={Wallet}
      description="پیش‌فاکتورهایی که انبار تأیید کرده و کالایشان برای مشتری رزرو است. با اولین دریافت فاکتور صادر می‌شود."
    >
      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <EntitySelect
          label="مشتری"
          placeholder="انتخاب مشتری..."
          emptyText="مشتری‌ای یافت نشد"
          items={customers}
          value={listState.customerId}
          onSelect={listState.setCustomerId}
          isLoading={isLoading}
        />
      </div>
      <ServerTable query={query} listState={listState} table={Table} />
      <CashierPaymentDialog saleId={payingId} onClose={() => setPayingId(null)} />
    </ListPageLayout>
  );
}
