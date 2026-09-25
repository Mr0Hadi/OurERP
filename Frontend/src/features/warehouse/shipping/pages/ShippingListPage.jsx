import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { useShippingFilterStore } from "../store/shippingFilterStore";
import { useDebouncedShippingFilters } from "../hooks/useDebouncedShippingFilters";
import { useShippableSalesQuery } from "../services/queries";
import ShippingFilters from "../components/table/ShippingFilters";
import ShippingTable from "../components/table/ShippingTable";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";
import PendingReturnGoodsCard from "../../returnsQueue/PendingReturnGoodsCard";

/**
 * صفِ ارسال = `GetSaleList` فیلترشده روی وضعیت‌های قابلِ ارسال.
 *
 * عودتِ مازاد به تامین‌کننده در این صف نیست: بکند لیستِ ترکیبی ندارد و
 * آن کار یک دورِ اثرِ `GOODS_OUT` روی خودِ مرجوعیِ خرید است — از صفحه‌ی
 * همان مرجوعی باز می‌شود.
 */
const ShippingListPage = () => {
  const { pagination, sorting, setPagination, setSorting } =
    useShippingFilterStore();
  const debouncedFilters = useDebouncedShippingFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useShippableSalesQuery(debouncedFilters, pagination);

  const rows = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <PendingReturnGoodsCard side="shipping" />

      <Card>
        <CardHeader className="flex sm:flex-row flex-col sm:items-center justify-between">
          <CardTitle>ارسال کالاهای انبار</CardTitle>
          <div className="text-sm text-muted-foreground">
            آماده‌سازی و ارسال سفارش‌هایی که هنوز کامل تحویل مشتری نشده‌اند
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <ShippingFilters />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <ShippingTable
                data={rows}
                isLoading={isLoading}
                totalPages={totalPages}
                currentPage={currentPage}
                pageSize={pagination.pageSize}
                onPaginationChange={setPagination}
                sorting={sorting}
                onSortingChange={setSorting}
              />
            </FetchingOverlay>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShippingListPage;
