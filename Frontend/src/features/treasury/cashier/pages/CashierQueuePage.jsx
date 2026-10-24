import { Wallet } from "lucide-react";
import { Link } from "react-router-dom";

import {
  PROFORMA_QUEUE_COLUMNS,
  queueActionColumn,
} from "@/features/sales/orders/components/table/proformaQueueColumns";
import ProformaQueueFilters from "@/features/sales/orders/components/table/ProformaQueueFilters";
import {
  useProformaQueueFilters,
  useProformaQueueQuery,
} from "@/features/sales/orders/services/queries";
import { createProformaQueueFilterStore } from "@/features/sales/orders/store/proformaQueueFilterStore";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import DataTable from "@/shared/components/table/DataTable";
import ServerTable from "@/shared/components/table/ServerTable";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";

/** فیلترهای صفِ صندوق (جدا از صفِ انبار). */
const useCashierFilterStore = createProformaQueueFilterStore();

const COLUMNS = [
  PROFORMA_QUEUE_COLUMNS.customer,
  PROFORMA_QUEUE_COLUMNS.number,
  PROFORMA_QUEUE_COLUMNS.paymentType,
  PROFORMA_QUEUE_COLUMNS.dueDate,
  PROFORMA_QUEUE_COLUMNS.reservation,
  PROFORMA_QUEUE_COLUMNS.payable,
  queueActionColumn((sale) =>
    sale.reservationSecondsLeft === 0 ? (
      <span className="text-xs text-muted-foreground">مهلت تمام شد</span>
    ) : (
      <Button asChild size="sm" className="w-full gap-1 md:w-auto">
        <Link to={routeWithId(ROUTES.TREASURY_CASHIER_DETAIL, sale.id)}>
          <Wallet className="size-4" />
          دریافت
        </Link>
      </Button>
    ),
  ),
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
    >
      <ProformaQueueFilters useStore={useCashierFilterStore} />
      <ServerTable query={query} listState={listState} table={CashierTable} />
    </ListPageLayout>
  );
}
