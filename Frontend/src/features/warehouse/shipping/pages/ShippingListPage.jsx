import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";

import ShippingFilters from "../components/table/ShippingFilters";
import ShippingTable from "../components/table/ShippingTable";
import { useDebouncedShippingFilters } from "../hooks/useDebouncedShippingFilters";
import { useShippableSalesQuery } from "../services/queries";
import { useShippingFilterStore } from "../store/shippingFilterStore";
import { useQueueRows } from "../../shared/useQueueRows";
import { needsDocumentList } from "../../shared/queueFilters";

/**
 * صفِ ارسال = `GetSaleList` فیلترشده روی وضعیت‌های قابلِ ارسال.
 *
 * عودتِ مازاد به تامین‌کننده در این صف نیست: بکند لیستِ ترکیبی ندارد و
 * آن کار یک دورِ اثرِ `GOODS_OUT` روی خودِ مرجوعیِ خرید است — از صفحه‌ی
 * همان مرجوعی باز می‌شود. کالای مرجوعیِ منتظر مثلِ صفِ دریافت از
 * `useQueueRows` می‌آید.
 */
export default function ShippingListPage() {
  const listState = useShippingFilterStore();
  const filters = useDebouncedShippingFilters();
  const query = useShippableSalesQuery(filters, listState.pagination, listState.sorting);
  const buildRows = useQueueRows("out", filters, listState.pagination.pageIndex === 0);

  return (
    <ListPageLayout
      title="ارسال کالاهای انبار"
      description="آماده‌سازی و ارسال سفارش‌هایی که هنوز کامل تحویل مشتری نشده‌اند"
    >
      <ShippingFilters />
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
