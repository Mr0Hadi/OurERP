import { PackageSearch } from "lucide-react";
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

/** فیلترهای صفِ بررسیِ انبار (جدا از صفِ صندوق). */
const useSaleCheckFilterStore = createProformaQueueFilterStore();

const COLUMNS = [
  PROFORMA_QUEUE_COLUMNS.customer,
  PROFORMA_QUEUE_COLUMNS.number,
  PROFORMA_QUEUE_COLUMNS.dueDate,
  PROFORMA_QUEUE_COLUMNS.warehouseIssues,
  { ...PROFORMA_QUEUE_COLUMNS.payable, header: "مبلغ (ریال)" },
  queueActionColumn((sale) => (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="w-full gap-1 md:w-auto"
    >
      <Link to={routeWithId(ROUTES.WAREHOUSE_SALE_CHECK_DETAIL, sale.id)}>
        <PackageSearch className="size-4" />
        بررسی و رزرو
      </Link>
    </Button>
  )),
];

function SaleCheckTable(props) {
  return (
    <DataTable
      {...props}
      columns={COLUMNS}
      emptyMessage="پیش‌فاکتوری در انتظارِ بررسیِ انبار نیست."
    />
  );
}

/**
 * صفِ بررسیِ انبار: پیش‌فاکتورهایی که مشتری تأییدشان کرده. انباردار کالای هر کدام را برمی‌دارد، اسکن
 * (رزرو) و تأیید می‌کند — یا با دلیل تغییر می‌دهد و تأیید می‌کند. فهرست هر ۳۰ ثانیه تازه می‌شود.
 */
export default function SaleCheckListPage() {
  const listState = useSaleCheckFilterStore();
  const filters = useProformaQueueFilters(useSaleCheckFilterStore);
  const query = useProformaQueueQuery(
    SaleProformaStageEnum.CUSTOMER_APPROVED,
    filters,
    listState.pagination,
    listState.sorting,
  );

  return (
    <ListPageLayout
      title="بررسی انبارِ پیش‌فاکتورها"
      icon={PackageSearch}
      description="پیش‌فاکتورهایی که مشتری تأیید کرده. کالا را بردارید و اسکن کنید تا برای مشتری رزرو شود."
    >
      <ProformaQueueFilters useStore={useSaleCheckFilterStore} />
      <ServerTable query={query} listState={listState} table={SaleCheckTable} />
    </ListPageLayout>
  );
}
