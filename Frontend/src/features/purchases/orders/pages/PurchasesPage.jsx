import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { usePurchaseFilterStore } from "../store/purchaseFilterStore";
import { useDebouncedPurchaseFilters } from "../hooks/useDebouncedPurchaseFilters";
import { usePurchasesQuery } from "../services/queries";
import { useSuppliersQuery } from "@/features/suppliers/services/queries";
import PurchaseFilters from "../components/table/PurchaseFilters";
import PurchaseTable from "../components/table/PurchaseTable";
import { ROUTES } from "@/shared/constants/routes";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

const PurchasesPage = () => {
  const navigate = useNavigate();
  const { pagination, sorting, setPagination, setSorting } =
    usePurchaseFilterStore();
  const debouncedFilters = useDebouncedPurchaseFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    usePurchasesQuery(debouncedFilters, pagination, sorting);

  const { data: suppliersData, isLoading: isSuppliersLoading } =
    useSuppliersQuery(
      {},
      { pageIndex: 0, pageSize: 200 },
      { id: "name", desc: false }
    );

  const suppliers = suppliersData?.items ?? [];
  const purchases = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مدیریت خریدها</CardTitle>
          <Button onClick={() => navigate(ROUTES.PURCHASES_NEW)} className="gap-2">
            <Plus className="h-4 w-4" />
            خرید جدید
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <PurchaseFilters
            suppliers={suppliers}
            isSuppliersLoading={isSuppliersLoading}
          />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <PurchaseTable
                data={purchases}
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

export default PurchasesPage;
