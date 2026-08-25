// src/features/organization/teams/pages/TeamsPage.jsx
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

import { useTeamFilterStore } from "../store/teamFilterStore";
import { useDebouncedTeamFilters } from "../hooks/useDebouncedTeamFilters";
import { useTeamsQuery } from "../services/queries";
import TeamFilters from "../components/table/TeamFilters";
import TeamTable from "../components/table/TeamTable";

const TeamsPage = () => {
  const navigate = useNavigate();
  const { pagination, sorting, setPagination, setSorting } = useTeamFilterStore();

  const debouncedFilters = useDebouncedTeamFilters();

  const { data, isLoading, isFetching, isError, error, refetch } = useTeamsQuery(
    debouncedFilters,
    pagination,
    sorting,
  );

  const teams = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مدیریت تیم‌ها</CardTitle>
          <Button onClick={() => navigate(ROUTES.ORG_TEAMS_NEW)} className="gap-2">
            <Plus className="h-4 w-4" />
            تیم جدید
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <TeamFilters />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <TeamTable
                data={teams}
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

export default TeamsPage;
