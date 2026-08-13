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
import { useHeaderStore } from "@/shared/store/headerStore";
import { useSalesReturnFilterStore } from "../store/salesReturnFilterStore";
import { useDebouncedSalesReturnFilters } from "../hooks/useDebouncedSalesReturnFilters";
import { useSalesReturnsQuery } from "../services/queries";
import { useCustomersQuery } from "@/features/customers/services/queries";
import SalesReturnFilters from "../components/table/SalesReturnFilters";
import SalesReturnTable from "../components/table/SalesReturnTable";
import { ROUTES } from "@/shared/constants/routes";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

export default function SalesReturnsListPage() {
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { pagination, sorting, setPagination, setSorting } = useSalesReturnFilterStore();
  const debouncedFilters = useDebouncedSalesReturnFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useSalesReturnsQuery(debouncedFilters, pagination, sorting);

  const { data: customersData, isLoading: isCustomersLoading } = useCustomersQuery(
    {},
    { pageIndex: 0, pageSize: 200 },
    { id: "name", desc: false },
  );

  const customers = customersData?.items ?? [];
  const returns = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  useEffect(() => {
    setHeader({ title: "مرجوعی از فروش", showBack: false });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>مرجوعی از فروش</CardTitle>
            </div>
          </div>
          <Button className="gap-2" onClick={() => navigate(ROUTES.SALES_RETURNS_NEW)}>
            <Plus className="h-4 w-4" />
            ثبت مرجوعی جدید
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <SalesReturnFilters customers={customers} isCustomersLoading={isCustomersLoading} />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <SalesReturnTable
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
