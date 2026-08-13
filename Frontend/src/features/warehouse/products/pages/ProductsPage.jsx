import { useProductsQuery } from "../services/queries";
import { useProductFilterStore } from "../store/productFilterStore";
import { useDebouncedFilters } from "../hooks/useDebouncedFilters";
import ProductTable from "../components/table/ProductTable";
import ProductFilters from "../components/table/ProductFilters";
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

const ProductsPage = () => {
  const navigate = useNavigate();
  const { pagination, sorting, setPagination, setSorting } =
    useProductFilterStore();

  const debouncedFilters = useDebouncedFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useProductsQuery(debouncedFilters, pagination, sorting);

  const products = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مدیریت لیست کالاها</CardTitle>
          <Button onClick={() => navigate(ROUTES.WAREHOUSE_PRODUCTS_NEW)} className="gap-2">
            <Plus className="h-4 w-4" />
            کالای جدید
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProductFilters />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <ProductTable
                data={products}
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

export default ProductsPage;
