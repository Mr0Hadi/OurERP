import { PackageSearch } from "lucide-react";
import { Link } from "react-router-dom";

import { useCustomersOptionsQuery } from "@/features/customers/services/queries";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import StatusBadge from "@/shared/components/status/StatusBadge";
import DataTable from "@/shared/components/table/DataTable";
import ServerTable from "@/shared/components/table/ServerTable";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";
import { useSaleCheckListFilters, useSaleCheckQueueQuery } from "../services/queries";
import { useSaleCheckFilterStore } from "../store/saleCheckFilterStore";

const COLUMNS = [
  {
    accessorKey: "id",
    meta: { mobile: "subtitle" },
    header: "پیش‌فاکتور",
    cell: (info) => <span className="font-mono text-xs text-muted-foreground">#{info.getValue()}</span>,
  },
  {
    accessorKey: "customerName",
    meta: { mobile: "title" },
    header: "مشتری",
    cell: (info) => <span className="font-light">{info.getValue()}</span>,
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
    id: "actions",
    header: "عملیات",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link to={routeWithId(ROUTES.WAREHOUSE_SALE_CHECK_DETAIL, row.original.id)}>
            <PackageSearch className="size-4" />
            بررسی و رزرو
          </Link>
        </Button>
      </div>
    ),
  },
];

function SaleCheckTable(props) {
  return <DataTable {...props} columns={COLUMNS} emptyMessage="پیش‌فاکتوری در انتظارِ بررسیِ انبار نیست." />;
}

/**
 * صفِ بررسیِ انبار: پیش‌فاکتورهایی که مشتری تأییدشان کرده. انباردار کالای هر کدام را
 * برمی‌دارد، اسکن (رزرو) می‌کند و آن را «آماده‌ی پرداخت» می‌کند — یا کسری را گزارش می‌دهد.
 */
export default function SaleCheckListPage() {
  const listState = useSaleCheckFilterStore();
  const filters = useSaleCheckListFilters();
  const query = useSaleCheckQueueQuery(filters, listState.pagination, listState.sorting);
  const { customers, isLoading } = useCustomersOptionsQuery();

  return (
    <ListPageLayout
      title="بررسی انبارِ پیش‌فاکتورها"
      icon={PackageSearch}
      description="پیش‌فاکتورهایی که مشتری تأیید کرده. کالا را بردارید و اسکن کنید تا برای مشتری رزرو شود."
    >
      {/* تنها فیلتر؛ پنلِ فیلترِ جمع‌شونده برای یک کنترل فقط یک کلیکِ اضافه بود. */}
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
      <ServerTable query={query} listState={listState} table={SaleCheckTable} />
    </ListPageLayout>
  );
}
