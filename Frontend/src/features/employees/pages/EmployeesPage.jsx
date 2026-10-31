import { UserCog } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import { ROUTES } from "@/shared/constants/routes";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

import { useEmployeeFilterStore } from "../store/employeeFilterStore";
import { useDebouncedEmployeeFilters } from "../hooks/useDebouncedEmployeeFilters";
import { useUserListQuery } from "../services/queries";
import EmployeeFilters from "../components/table/EmployeeFilters";
import EmployeeTable from "../components/table/EmployeeTable";

const EmployeesPage = () => {
  const { pagination, setPagination, sorting, setSorting } = useEmployeeFilterStore();

  const filters = useDebouncedEmployeeFilters();

  // `page` در سرور از ۱ شروع می‌شود و `pageIndex` جدول از ۰.
  const query = useUserListQuery({
    page: pagination.pageIndex + 1,
    take: pagination.pageSize,
    ...filters,
    sorting,
  });
  const { data, isLoading, isFetching, isError, error, refetch } = query;

  const userList = data?.userList ?? [];
  const pageCount = data?.page?.pageCount ?? 1;
  const currentPage = data?.page?.page ? data.page.page - 1 : pagination.pageIndex;

  return (
    <ListPageLayout
      title="مدیریت کارمندان"
      icon={UserCog}
      create={{ label: "کارمند جدید", to: ROUTES.EMPLOYEES_NEW }}
    >
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
            sorting={sorting}
            onSortingChange={setSorting}
            totalCount={data?.page?.total}
            refresh={query}
          />
        </FetchingOverlay>
      )}
    </ListPageLayout>
  );
};

export default EmployeesPage;
