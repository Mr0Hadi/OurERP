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
const fa = (n) => Number(n).toLocaleString("fa-IR");

/**
 * صفحه‌بندیِ زیرِ جدول.
 *
 * @param totalCount تعدادِ کلِ نتایج؛ اگر باشد «۲۱–۳۰ از ۷۵» نشان داده می‌شود.
 * @param compact    چیدمانِ یک‌ردیفه‌ی موبایل: فقط قبلی/بعدی، بدونِ اول/آخر.
 */
export default function DataTablePagination({
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  totalCount,
  compact = false,
}) {
  const pages = Math.max(totalPages || 1, 1);
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage + 1 >= pages;
  const goTo = (pageIndex) => onPaginationChange({ pageIndex, pageSize });

  const from = totalCount ? currentPage * pageSize + 1 : 0;
  const to = totalCount ? Math.min((currentPage + 1) * pageSize, totalCount) : 0;

  const sizeSelect = (
    <Select
      value={pageSize.toString()}
      onValueChange={(value) => onPaginationChange({ pageIndex: 0, pageSize: Number(value) })}
    >
      <SelectTrigger size="sm" className="w-[64px]" aria-label="ردیف در صفحه">
        <SelectValue />
      </SelectTrigger>
      <SelectContent side="top">
        {PAGE_SIZE_OPTIONS.map((size) => (
          <SelectItem key={size} value={size.toString()}>
            {fa(size)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1 px-3"
          onClick={() => goTo(currentPage - 1)}
          disabled={isFirstPage}
        >
          <ChevronRight className="size-4" />
          قبلی
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="whitespace-nowrap tabular-nums">
            {fa(currentPage + 1)} / {fa(pages)}
          </span>
          {sizeSelect}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1 px-3"
          onClick={() => goTo(currentPage + 1)}
          disabled={isLastPage}
        >
          بعدی
          <ChevronLeft className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-between gap-2 px-1 sm:flex-row">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs">ردیف در صفحه</span>
          {sizeSelect}
        </div>
        {totalCount > 0 && (
          <span className="whitespace-nowrap text-xs tabular-nums">
            {fa(from)}–{fa(to)} از {fa(totalCount)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" onClick={() => goTo(0)} disabled={isFirstPage} aria-label="اولین صفحه">
          <ChevronsRight />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => goTo(currentPage - 1)} disabled={isFirstPage} aria-label="صفحه قبل">
          <ChevronRight />
        </Button>
        <span className="whitespace-nowrap px-2 text-sm tabular-nums">
          صفحه {fa(currentPage + 1)} از {fa(pages)}
        </span>
        <Button variant="outline" size="icon-sm" onClick={() => goTo(currentPage + 1)} disabled={isLastPage} aria-label="صفحه بعد">
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => goTo(pages - 1)} disabled={isLastPage} aria-label="آخرین صفحه">
          <ChevronsLeft />
        </Button>
      </div>
    </div>
  );
}
