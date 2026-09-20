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

import { useEmployeeFilterStore } from "../store/employeeFilterStore";
import { useDebouncedEmployeeFilters } from "../hooks/useDebouncedEmployeeFilters";
import { useUserListQuery } from "../services/queries";
import EmployeeFilters from "../components/table/EmployeeFilters";
import EmployeeTable from "../components/table/EmployeeTable";

const EmployeesPage = () => {
  const navigate = useNavigate();
  const { pagination, setPagination } = useEmployeeFilterStore();

  const filters = useDebouncedEmployeeFilters();

  // `page` در سرور از ۱ شروع می‌شود و `pageIndex` جدول از ۰.
  const { data, isLoading, isFetching, isError, error, refetch } =
    useUserListQuery({
      page: pagination.pageIndex + 1,
      take: pagination.pageSize,
      ...filters,
    });

  const userList = data?.userList ?? [];
  const pageCount = data?.page?.pageCount ?? 1;
  const currentPage = data?.page?.page ? data.page.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مدیریت کارمندان</CardTitle>
          <Button
            onClick={() => navigate(ROUTES.EMPLOYEES_NEW)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            کارمند جدید
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <EmployeeFilters />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <EmployeeTable
                data={userList}
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

export default EmployeesPage;
