import { Users } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import { ROUTES } from "@/shared/constants/routes";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

import { useTeamFilterStore } from "../store/teamFilterStore";
import { useDebouncedTeamFilters } from "../hooks/useDebouncedTeamFilters";
import { useTeamListQuery } from "../services/queries";
import TeamFilters from "../components/table/TeamFilters";
import TeamTable from "../components/table/TeamTable";

const TeamsPage = () => {
  const { pagination, setPagination } = useTeamFilterStore();

  const filters = useDebouncedTeamFilters();

  // `page` در سرور از ۱ شروع می‌شود و `pageIndex` جدول از ۰.
  const query = useTeamListQuery({
    page: pagination.pageIndex + 1,
    take: pagination.pageSize,
    ...filters,
  });
  const { data, isLoading, isFetching, isError, error, refetch } = query;

  const teamList = data?.teamList ?? [];
  const pageCount = data?.page?.pageCount ?? 1;
  const currentPage = data?.page?.page ? data.page.page - 1 : pagination.pageIndex;

  return (
    <ListPageLayout
      title="مدیریت تیم‌ها"
      icon={Users}
      create={{ label: "تیم جدید", to: ROUTES.ORG_TEAMS_NEW }}
    >
      <TeamFilters />

      {isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <FetchingOverlay active={isFetching && !isLoading}>
          <TeamTable
            data={teamList}
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

export default TeamsPage;
