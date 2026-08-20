import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50];

export default function DataTablePagination({
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
}) {
  const isLastPage = currentPage + 1 >= totalPages;

  return (
    <div className="flex flex-col gap-2 sm:flex-row items-center justify-between px-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-light whitespace-nowrap">ردیف در صفحه</p>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) =>
            onPaginationChange({ pageIndex: 0, pageSize: Number(value) })
          }
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size.toLocaleString("fa-IR")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPaginationChange({ pageIndex: 0, pageSize })}
          disabled={currentPage === 0}
          aria-label="اولین صفحه"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onPaginationChange({ pageIndex: currentPage - 1, pageSize })
          }
          disabled={currentPage === 0}
          aria-label="صفحه قبل"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <span className="text-sm px-2 whitespace-nowrap">
          صفحه {(currentPage + 1).toLocaleString("fa-IR")} از{" "}
          {totalPages.toLocaleString("fa-IR")}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onPaginationChange({ pageIndex: currentPage + 1, pageSize })
          }
          disabled={isLastPage}
          aria-label="صفحه بعد"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onPaginationChange({ pageIndex: totalPages - 1, pageSize })
          }
          disabled={isLastPage}
          aria-label="آخرین صفحه"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
