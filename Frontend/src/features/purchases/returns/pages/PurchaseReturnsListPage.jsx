import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseReturnFilterStore } from "../store/purchaseReturnFilterStore";
import { useDebouncedPurchaseReturnFilters } from "../hooks/useDebouncedPurchaseReturnFilters";
import { usePurchaseReturnsQuery } from "../services/queries";
import PurchaseReturnFilters from "../components/table/PurchaseReturnFilters";
import PurchaseReturnTable from "../components/table/PurchaseReturnTable";
import { useSuppliersQuery } from "@/features/suppliers/services/queries";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

export default function PurchaseReturnsListPage() {
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { pagination, sorting, setPagination, setSorting } = usePurchaseReturnFilterStore();
  const debouncedFilters = useDebouncedPurchaseReturnFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    usePurchaseReturnsQuery(debouncedFilters, pagination, sorting);

  const { data: suppliersData, isLoading: isSuppliersLoading } =
    useSuppliersQuery(
      {},
      { pageIndex: 0, pageSize: 200 },
      { id: "name", desc: false },
    );

  const suppliers = suppliersData?.items ?? [];
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
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>مرجوعی به تامین‌کننده</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                ادعاهای ثبت‌شده روی خریدها و تصمیم‌هایی که برایشان گرفته شده.
              </p>
            </div>
          </div>
          <Button
            className="gap-2"
            onClick={() => navigate(ROUTES.PURCHASES_RETURNS_NEW)}
          >
            <Plus className="h-4 w-4" />
            ثبت مرجوعی جدید
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <PurchaseReturnFilters
            suppliers={suppliers}
            isSuppliersLoading={isSuppliersLoading}
          />

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