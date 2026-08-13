
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useReceivingFilterStore } from "../store/receivingFilterStore";
import { useDebouncedReceivingFilters } from "../hooks/useDebouncedReceivingFilters";
import { useIncomingQueueQuery } from "../services/queries";
import { useCustomersQuery } from "@/features/customers/services/queries";
import { useSuppliersQuery } from "@/features/suppliers/services/queries";
import ReceivingFilters from "../components/table/ReceivingFilters";
import ReceivingTable from "../components/table/ReceivingTable";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

const getPartyName = (p) => p.name || p.companyName || [p.firstName, p.lastName].filter(Boolean).join(" ") || "بدون نام";

const ReceivingListPage = () => {
  const { pagination, sorting, setPagination, setSorting } = useReceivingFilterStore();
  const debouncedFilters = useDebouncedReceivingFilters();

  const { data, isLoading, isFetching, isError, error, refetch } = useIncomingQueueQuery(debouncedFilters, pagination, sorting);

  const { data: customersData, isLoading: isCustomersLoading } = useCustomersQuery({}, { pageIndex: 0, pageSize: 200 }, { id: "name", desc: false });
  const { data: suppliersData, isLoading: isSuppliersLoading } = useSuppliersQuery({}, { pageIndex: 0, pageSize: 200 }, { id: "name", desc: false });

  const parties = [
    ...(customersData?.items ?? []).map((c) => ({ key: `customer:${c.id}`, name: getPartyName(c), type: "customer" })),
    ...(suppliersData?.items ?? []).map((s) => ({ key: `supplier:${s.id}`, name: getPartyName(s), type: "supplier" })),
  ];

  const rows = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex sm:flex-row flex-col sm:items-center justify-between">
          <CardTitle>دریافت کالاهای انبار</CardTitle>
          <div className="text-sm text-muted-foreground">بررسی و تأیید کالاهای خریداری‌شده و مرجوعی‌های فروش</div>
        </CardHeader>

        <CardContent className="space-y-3">
          <ReceivingFilters parties={parties} isPartiesLoading={isCustomersLoading || isSuppliersLoading} />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <ReceivingTable
                data={rows} isLoading={isLoading} totalPages={totalPages} currentPage={currentPage}
                pageSize={pagination.pageSize} onPaginationChange={setPagination} sorting={sorting} onSortingChange={setSorting}
              />
            </FetchingOverlay>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceivingListPage;