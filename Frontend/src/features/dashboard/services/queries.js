import { useQueries, useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  fetchSaleReport,
  fetchPurchaseReport,
  fetchScopePerformance,
  fetchQueueCount,
} from "./api-v1";
import { reportKeys, dashboardKeys } from "./queryKeys";

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
        gcTime: 1000 * 60 * 15,
      },
      {
        queryKey: reportKeys.purchase(params),
        queryFn: () => fetchPurchaseReport(params),
        placeholderData: keepPreviousData,
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

/**
 * گزارشِ یک محدوده («من»، «تیم»، «واحد»).
 *
 * ۴۰۴ تکرار نمی‌شود: یعنی سرور هنوز این گزارش را ندارد، نه خطای گذرا —
 * ویجت همان را به‌صورتِ «هنوز فعال نشده» نشان می‌دهد (`isUnavailable`).
 * ۴۰۳ هم همین‌طور: نقشِ کاربر همین حالا عوض شده و کشِ `GetUserInfo`
 * هنوز نقشِ قبلی را دارد.
 */
export function useScopePerformanceQuery(scope, params) {
  const query = useQuery({
    queryKey: reportKeys.scope(scope, params),
    queryFn: () => fetchScopePerformance(scope, params),
    placeholderData: keepPreviousData,
    retry: (failureCount, error) =>
      ![403, 404].includes(error?.response?.status) && failureCount < 1,
  });

  return {
    ...query,
    isUnavailable: query.error?.response?.status === 404,
  };
}

/**
 * شمارنده‌ی همه‌ی صف‌های قابلِ دیدنِ این کاربر — یک درخواست برای هر
 * (صف، وضعیت)، موازی. هر صف جمعِ بخش‌هایش را می‌گیرد، و خطای یک صف
 * بقیه را از کار نمی‌اندازد.
 */
export function useQueueCountsQuery(queues) {
  const parts = queues.flatMap((queue) =>
    queue.parts.map((part) => ({ queue, part })),
  );

  const results = useQueries({
    queries: parts.map(({ queue, part }) => ({
      queryKey: dashboardKeys.queue(queue.source, part.status),
      queryFn: () => fetchQueueCount(queue.source, part.status),
    })),
  });

  return queues.map((queue) => {
    const own = parts
      .map((entry, index) => ({ ...entry, result: results[index] }))
      .filter((entry) => entry.queue.id === queue.id);

    return {
      queue,
      total: own.reduce((acc, e) => acc + (e.result.data ?? 0), 0),
      parts: own.map((e) => ({ ...e.part, count: e.result.data ?? 0 })),
      isLoading: own.some((e) => e.result.isLoading),
      isError: own.some((e) => e.result.isError),
      refetch: () => own.forEach((e) => e.result.refetch()),
    };
  });
}
