// src/features/dashboard/services/queries.js
import { useQueries, keepPreviousData } from "@tanstack/react-query";
import { fetchSaleReport, fetchPurchaseReport } from "./api-v1";
// import { fetchSaleReport, fetchPurchaseReport } from "./api-v1";
import { reportKeys } from "./queryKeys";

/**
 * هر دو گزارش با *یک* هوک گرفته می‌شوند.
 *
 * دلیلش این نیست که کوتاه‌تر است: داشبورد تقریباً همه‌جا این دو را کنارِ
 * هم نشان می‌دهد (فروش در برابر خرید، درآمد در برابر ارزشِ دریافتی). با
 * دو هوکِ جدا، صفحه دو بار وضعیتِ «در حال بارگذاری» و دو بار «خطا»
 * داشت و کارت‌ها ناهماهنگ ظاهر می‌شدند. `useQueries` هر دو را موازی
 * می‌فرستد ولی یک وضعیتِ واحد می‌دهد.
 *
 * `placeholderData` عمدی است: با عوض‌کردنِ بازه یا نوعِ بازه، نمودارها
 * به‌جای پریدن به اسکلتِ خالی، داده‌ی قبلی را نگه می‌دارند و فقط محو
 * می‌شوند.
 */
export function useDashboardReportsQuery(params) {
  const results = useQueries({
    queries: [
      {
        queryKey: reportKeys.sale(params),
        queryFn: () => fetchSaleReport(params),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
      },
      {
        queryKey: reportKeys.purchase(params),
        queryFn: () => fetchPurchaseReport(params),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
      },
    ],
  });

  const [sale, purchase] = results;

  return {
    salePeriods: sale.data?.periods ?? [],
    purchasePeriods: purchase.data?.periods ?? [],
    // «اولین بارگذاری» یعنی هنوز هیچ داده‌ای نداریم — نه هر بار که
    // یک درخواستِ تازه در جریان است.
    isLoading: results.some((r) => r.isLoading),
    isFetching: results.some((r) => r.isFetching),
    isError: results.some((r) => r.isError),
    error: results.find((r) => r.error)?.error ?? null,
    refetch: () => results.forEach((r) => r.refetch()),
  };
}
