import { RefreshCw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

/**
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
