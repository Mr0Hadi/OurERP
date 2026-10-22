import { RefreshCw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

/**
 * دکمه‌ی «تازه‌سازی»ِ یک فهرست (کنارِ عنوانِ `ListPageLayout`، در `actions`) — برای صف‌هایی که زنده‌اند و کاربر
 * می‌خواهد بی‌انتظارِ تازه‌سازیِ خودکار ببیند. در حینِ خواندن می‌چرخد و بسته است.
 *
 * @param query خروجیِ `useQuery`ِ همان فهرست
 */
export default function RefreshButton({ query }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-9"
      aria-label="تازه‌سازی"
      title="تازه‌سازی"
      onClick={() => query.refetch()}
      disabled={query.isFetching}
    >
      <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
    </Button>
  );
}
