// src/features/purchases/pages/PurchaseReturnsListPage.jsx
import { useEffect } from "react";
import { PackageX, Undo2 } from "lucide-react";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/components/ui/tabs";
import { useHeaderStore } from "@/shared/store/headerStore";
import usePurchaseReturnFilterStore from "../store/purchaseReturnFilterStore";
import { useDebouncedPurchaseReturnFilters } from "../hooks/useDebouncedPurchaseReturnFilters";
import {
  usePurchaseReturnsQuery,
  useShortageReportsQuery,
} from "../services/returns/queries";
import PurchaseReturnFilters from "../components/table/PurchaseReturnFilters";
import PurchaseReturnTable from "../components/table/PurchaseReturnTable";
import ShortageReportsList from "../components/table/ShortageReportsList";

export default function PurchaseReturnsListPage() {
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { pagination, sorting, setPagination, setSorting } =
    usePurchaseReturnFilterStore();
  const debouncedFilters = useDebouncedPurchaseReturnFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    usePurchaseReturnsQuery(debouncedFilters, pagination, sorting);

  // فقط برای نشان‌دادن تعداد روی تب گزارش‌ها؛ کوئری با همین کلید در
  // ShortageReportsList هم استفاده می‌شود و از کش مشترک React Query بهره می‌برد
  const { data: reports = [] } = useShortageReportsQuery();

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
        <CardHeader>
          <CardTitle>مرجوعی به تامین‌کننده</CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="reports" className="w-full">
            <TabsList>
              <TabsTrigger value="reports" className="gap-1.5">
                <PackageX className="h-4 w-4" />
                گزارش‌های کسری قابل پیگیری
                {reports.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 mr-1">
                    {reports.length.toLocaleString("fa-IR")}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="returns" className="gap-1.5">
                <Undo2 className="h-4 w-4" />
                مرجوعی‌های ثبت‌شده
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="pt-4">
              <p className="text-xs text-muted-foreground pb-3">
                این‌ها کسری‌هایی هستند که انباردار هنگام دریافت گزارش داده و
                هنوز مرجوعی برای آن‌ها ثبت نشده. روی هر ردیف کلیک کنید تا با
                اطلاعات دقیق انبار، فرم ثبت مرجوعی باز شود.
              </p>
              <ShortageReportsList />
            </TabsContent>

            <TabsContent value="returns" className="pt-4 space-y-3">
              <PurchaseReturnFilters />

              {isError ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                  <p className="text-sm text-muted-foreground">
                    {error?.message ?? "خطایی رخ داده است"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="gap-2"
                  >
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
