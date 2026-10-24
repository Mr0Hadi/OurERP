import { Building2 } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import { ROUTES } from "@/shared/constants/routes";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

import { useDepartmentFilterStore } from "../store/departmentFilterStore";
import { useDebouncedDepartmentFilters } from "../hooks/useDebouncedDepartmentFilters";
import { useDepartmentListQuery } from "../services/queries";
import DepartmentFilters from "../components/table/DepartmentFilters";
import DepartmentTable from "../components/table/DepartmentTable";

const DepartmentsPage = () => {
  const { pagination, setPagination } = useDepartmentFilterStore();

  const filters = useDebouncedDepartmentFilters();

  // `page` در سرور از ۱ شروع می‌شود و `pageIndex` جدول از ۰.
  const query = useDepartmentListQuery({
    page: pagination.pageIndex + 1,
    take: pagination.pageSize,
    ...filters,
  });
  const { data, isLoading, isFetching, isError, error, refetch } = query;

  const departmentList = data?.departmentList ?? [];
  const pageCount = data?.page?.pageCount ?? 1;
  const currentPage = data?.page?.page ? data.page.page - 1 : pagination.pageIndex;

  return (
    <ListPageLayout
      title="مدیریت واحدهای سازمانی"
      icon={Building2}
      create={{ label: "واحد جدید", to: ROUTES.ORG_DEPARTMENTS_NEW }}
    >
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
            refresh={query}
          />
        </FetchingOverlay>
      )}
    </ListPageLayout>
  );
};

export default DepartmentsPage;
