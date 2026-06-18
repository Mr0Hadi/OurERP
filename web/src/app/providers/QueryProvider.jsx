import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 1,  // 1 دقیقه default
            gcTime: 1000 * 60 * 5,     // 5 دقیقه cache نگه دار
            retry: 1,                   // یک بار retry کافی است
            refetchOnWindowFocus: true, // مهم برای کاربران چند ساعته
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
