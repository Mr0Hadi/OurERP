import { useSuppliersQuery } from "../services/queries";
import { useSupplierFilterStore } from "../store/supplierFilterStore";
import { useDebouncedFilters } from "../hooks/useDebouncedFilters";
import SupplierTable from "../components/SupplierTable";
import SupplierFilters from "../components/SupplierFilters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

const SuppliersPage = () => {
  const navigate = useNavigate();
  const { pagination, sorting, setPagination, setSorting } =
    useSupplierFilterStore();

  const debouncedFilters = useDebouncedFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useSuppliersQuery(debouncedFilters, pagination, sorting);

  const suppliers = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مدیریت تامین‌کنندگان</CardTitle>
          <Button onClick={() => navigate(ROUTES.SUPPLIERS_NEW)} className="gap-2">
            <Plus className="h-4 w-4" />
            تامین‌کننده جدید
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <SupplierFilters />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <SupplierTable
                data={suppliers}
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

export default SuppliersPage;
