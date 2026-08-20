import { useEffect } from "react";
import { Undo2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseReturnFilterStore } from "../store/purchaseReturnFilterStore";
import { useDebouncedPurchaseReturnFilters } from "../hooks/useDebouncedPurchaseReturnFilters";
import { usePurchaseReturnsQuery } from "../services/queries";
import PurchaseReturnFilters from "../components/table/PurchaseReturnFilters";
import PurchaseReturnTable from "../components/table/PurchaseReturnTable";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

export default function PurchaseReturnsListPage() {
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { pagination, sorting, setPagination, setSorting } = usePurchaseReturnFilterStore();
  const debouncedFilters = useDebouncedPurchaseReturnFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    usePurchaseReturnsQuery(debouncedFilters, pagination, sorting);

  const returns = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  useEffect(() => {
    setHeader({ title: "مرجوعی به تامین‌کننده", showBack: false });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Undo2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>مرجوعی به تامین‌کننده</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              کسری‌های گزارش‌شده توسط انبار با وضعیت{" "}
              <span className="font-medium text-amber-700 dark:text-amber-400">
                «قابل پیگیری»
              </span>{" "}
              کنار مرجوعی‌های در حال هماهنگی نمایش داده می‌شوند.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <PurchaseReturnFilters />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <PurchaseReturnTable
                data={returns}
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
}