import { Skeleton } from "@/shared/components/ui/skeleton";

export default function TableLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
