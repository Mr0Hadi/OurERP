import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // چند کاربر هم‌زمان روی همان داده کار می‌کنند؛ هر mount/focus
            // باید از سرور بخواند تا کسی داده‌ی کهنه نبیند.
            staleTime: 0,
            gcTime: 1000 * 60 * 5,     // 5 دقیقه cache نگه دار
            // خطای ۴xx (پیدا نشد، دسترسی نداری، ورودی نامعتبر) با تکرار درست
            // نمی‌شود و فقط نمایشِ پیام را عقب می‌اندازد؛ فقط قطعیِ شبکه و
            // خطای سرور یک بار دیگر امتحان می‌شوند.
            retry: (failureCount, error) => {
              const status = error?.response?.status;
              if (status && status < 500) return false;
              return failureCount < 1;
            },
            refetchOnWindowFocus: true, // مهم برای کاربران چند ساعته
          },
          mutations: {
            // ۴۰۹ فقط از میان‌افزارِ Idempotency-Key می‌آید: درخواستِ اولِ همین
            // کلید هنوز روی سرور در جریان است. retry همان شیءِ variables و در
            // نتیجه همان کلید را می‌فرستد، پس سرور یا پاسخِ اول را پخش می‌کند
            // یا اگر اولی شکست خورده بود، یک بار اجرا می‌کند. بقیه‌ی خطاها
            // تکرار نمی‌شوند.
            retry: (failureCount, error) =>
              error?.response?.status === 409 && failureCount < 3,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
