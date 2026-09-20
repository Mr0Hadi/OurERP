import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

import { useDepartmentFilterStore } from "../store/departmentFilterStore";
import { useDebouncedDepartmentFilters } from "../hooks/useDebouncedDepartmentFilters";
import { useDepartmentListQuery } from "../services/queries";
import DepartmentFilters from "../components/table/DepartmentFilters";
import DepartmentTable from "../components/table/DepartmentTable";

const DepartmentsPage = () => {
  const navigate = useNavigate();
  const { pagination, setPagination } = useDepartmentFilterStore();

  const filters = useDebouncedDepartmentFilters();

  // `page` در سرور از ۱ شروع می‌شود و `pageIndex` جدول از ۰.
  const { data, isLoading, isFetching, isError, error, refetch } =
    useDepartmentListQuery({
      page: pagination.pageIndex + 1,
      take: pagination.pageSize,
      ...filters,
    });

  const departmentList = data?.departmentList ?? [];
  const pageCount = data?.page?.pageCount ?? 1;
  const currentPage = data?.page?.page ? data.page.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مدیریت واحدهای سازمانی</CardTitle>
          <Button
            onClick={() => navigate(ROUTES.ORG_DEPARTMENTS_NEW)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            واحد جدید
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <DepartmentFilters />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <DepartmentTable
                data={departmentList}
                isLoading={isLoading}
                totalPages={pageCount}
                currentPage={currentPage}
                pageSize={pagination.pageSize}
                onPaginationChange={setPagination}
              />
            </FetchingOverlay>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DepartmentsPage;
