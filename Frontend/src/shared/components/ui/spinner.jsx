import { Loader2Icon } from "lucide-react"

import { cn } from "@/shared/lib/utils"

function Spinner({
  className,
  ...props
}) {
  return (
    <Loader2Icon
      role="status"
      aria-label="در حال بارگذاری"
      data-slot="spinner"
      className={cn("size-4 animate-spin", className)}
      {...props} />
  );
}

export { Spinner }
