// src/features/purchases/pages/PurchaseReturnsListPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import usePurchaseReturnFilterStore from "../store/purchaseReturnFilterStore";
import { useDebouncedPurchaseReturnFilters } from "../hooks/useDebouncedPurchaseReturnFilters";
import { usePurchaseReturnsQuery } from "../services/returns/queries";
import PurchaseReturnFilters from "../components/table/PurchaseReturnFilters";
import PurchaseReturnTable from "../components/table/PurchaseReturnTable";
import { ROUTES } from "@/shared/constants/routes";

export default function PurchaseReturnsListPage() {
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { pagination, sorting, setPagination, setSorting } = usePurchaseReturnFilterStore();
  const debouncedFilters = useDebouncedPurchaseReturnFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    usePurchaseReturnsQuery(debouncedFilters, pagination, sorting);

  const returns = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  useEffect(() => {
    setHeader({ title: "مرجوعی‌های خرید", showBack: false });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مرجوعی‌های خرید</CardTitle>
          <Button onClick={() => navigate(ROUTES.PURCHASES_RETURNS_NEW)} className="gap-2">
            <Undo2 className="h-4 w-4" />
            ثبت مرجوعی جدید
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <PurchaseReturnFilters />

          {isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{error?.message ?? "خطایی رخ داده است"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                تلاش مجدد
              </Button>
            </div>
          ) : (
            <div className="relative">
              {isFetching && !isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card/60 backdrop-blur-[2px]">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                </div>
              )}
              <PurchaseReturnTable
                data={returns}
                isLoading={isLoading}
                totalPages={totalPages}
                currentPage={currentPage}
                pageSize={pagination.pageSize}
                onPaginationChange={setPagination}
                sorting={sorting}
                onSortingChange={setSorting}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}