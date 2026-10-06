import { Truck } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import SaleStatusBadge from "@/shared/components/status/SaleStatusBadge";
import { ROUTES } from "@/shared/constants/routes";
import { useCustomersOptionsQuery } from "@/features/customers/services/queries";

import { useShippableSalesQuery, useShippingListFilters } from "../services/queries";
import { useShippingFilterStore } from "../store/shippingFilterStore";
import { SHIPPING_STATUS_OPTIONS } from "../domain/shippingVocabulary";
import { useQueueRows } from "../../shared/useQueueRows";
import { needsDocumentList } from "../../shared/queueFilters";
import QueueFilters from "../../shared/QueueFilters";
import QueueTable from "../../shared/QueueTable";

function ShippingTable(props) {
  return (
    <QueueTable
      {...props}
      party={{ key: "customerName", header: "مشتری / تامین‌کننده" }}
      StatusBadge={SaleStatusBadge}
      action={{ label: "آماده‌سازی و ارسال", icon: Truck, route: ROUTES.WAREHOUSE_SHIPPING_DETAIL }}
      emptyMessage="فروشی در انتظار ارسال نیست."
    />
  );
}

/**
 * صفِ ارسال = `GetSaleList` فیلترشده روی وضعیت‌های قابلِ ارسال.
 *
 * کالای مرجوعیِ منتظر (`useQueueRows`): جایگزینِ مشتری روی ردیفِ همان فروش
 * علامت می‌خورد؛ عودت به تامین‌کننده و تعیین تکلیفِ قرنطینه‌ی مرجوعی‌های خرید
 * ردیفِ خودشان را دارند و به صفحه‌ی همان مرجوعی می‌روند.
 */
export default function ShippingListPage() {
  const listState = useShippingFilterStore();
  const filters = useShippingListFilters();
  const query = useShippableSalesQuery(filters, listState.pagination, listState.sorting);
  const buildRows = useQueueRows("out", filters, listState.pagination.pageIndex === 0);
  const { customers, isLoading: isCustomersLoading } = useCustomersOptionsQuery();

  return (
    <ListPageLayout
      title="ارسال کالاهای انبار"
      description="آماده‌سازی و ارسال سفارش‌هایی که هنوز کامل تحویل مشتری نشده‌اند"
    >
      <QueueFilters
        useStore={useShippingFilterStore}
        party={{
          key: "customerId",
          label: "مشتری",
          emptyText: "مشتری‌ای یافت نشد",
          items: customers,
          isLoading: isCustomersLoading,
          phoneOf: (customer) => customer.phoneNumber,
        }}
        statusOptions={SHIPPING_STATUS_OPTIONS}
        searchPlaceholder="شماره فاکتور فروش..."
      />
      <ServerTable
        query={query}
        listState={listState}
        table={ShippingTable}
        transform={buildRows}
        singlePage={!needsDocumentList(filters.status)}
      />
    </ListPageLayout>
  );
}
