// features/customers/pages/CustomersPage.jsx
import { useCustomersQuery } from "../services/queries";
import { useCustomerFilterStore } from "../store/customerFilterStore";
import { useDebouncedFilters } from "../hooks/useDebouncedFilters";
import CustomerTable from "../components/CustomerTable";
import CustomerFilters from "../components/CustomerFilters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ROUTES } from "@/shared/constants/routes";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

const CustomersPage = () => {
  const navigate = useNavigate();
  const { pagination, sorting, setPagination, setSorting } =
    useCustomerFilterStore();

  const debouncedFilters = useDebouncedFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useCustomersQuery(debouncedFilters, pagination, sorting);

  const customers = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مدیریت مشتریان</CardTitle>
          <Button onClick={() => navigate(ROUTES.CUSTOMERS_NEW)} className="gap-2">
            <Plus className="h-4 w-4" />
            مشتری جدید
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <CustomerFilters />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <CustomerTable
                data={customers}
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

export default CustomersPage;
