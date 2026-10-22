import { PackageSearch, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import ProformaQueueFilters from "@/features/sales/orders/components/table/ProformaQueueFilters";
import { useProformaQueueFilters, useProformaQueueQuery } from "@/features/sales/orders/services/queries";
import { createProformaQueueFilterStore } from "@/features/sales/orders/store/proformaQueueFilterStore";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import StatusBadge from "@/shared/components/status/StatusBadge";
import DataTable from "@/shared/components/table/DataTable";
import ServerTable from "@/shared/components/table/ServerTable";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";

/** فیلترهای صفِ بررسیِ انبار (جدا از صفِ صندوق). */
const useSaleCheckFilterStore = createProformaQueueFilterStore();

const COLUMNS = [
  {
    accessorKey: "customerName",
    meta: { mobile: "title" },
    header: "مشتری",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  },
  {
    id: "number",
    meta: { mobile: "subtitle" },
    header: "پیش‌فاکتور",
    enableSorting: false,
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">#{row.original.id}</span>,
  },
  {
    accessorKey: "paymentDate",
    header: "سررسید",
    cell: (info) => (
      <span className="tabular-nums text-sm">{info.getValue() ? gregorianToPersian(info.getValue()) : "—"}</span>
    ),
  },
  {
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
  {
    accessorKey: "totalAmount",
    meta: { mobile: "highlight" },
    header: "مبلغ (ریال)",
    cell: (info) => <span className="tabular-nums">{formatNumber(info.getValue())}</span>,
  },
  {
    id: "actions",
    // بی‌برچسب: در موبایل فوترِ کارت می‌شود.
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <Button asChild variant="outline" size="sm" className="w-full gap-1 md:w-auto">
        <Link to={routeWithId(ROUTES.WAREHOUSE_SALE_CHECK_DETAIL, row.original.id)}>
          <PackageSearch className="size-4" />
          بررسی و رزرو
        </Link>
      </Button>
    ),
  },
];

function SaleCheckTable(props) {
  return <DataTable {...props} columns={COLUMNS} emptyMessage="پیش‌فاکتوری در انتظارِ بررسیِ انبار نیست." />;
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
          <RefreshCw className={query.isFetching ? "size-4 animate-spin" : "size-4"} />
        </Button>
      }
    >
      <ProformaQueueFilters useStore={useSaleCheckFilterStore} />
      <ServerTable query={query} listState={listState} table={SaleCheckTable} />
    </ListPageLayout>
  );
}
