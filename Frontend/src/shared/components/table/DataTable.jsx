import { useCallback, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import SortIcon from "./SortIcon";
import TableLoadingSkeleton from "./TableLoadingSkeleton";
import DataTablePagination from "./DataTablePagination";
import MobileRowCards from "./MobileRowCards";
import { useIsMobile } from "@/shared/hooks/useIsMobile";

/**
 * پوسته‌ی مشترک جدول‌های سرور-ساید (صفحه‌بندی و مرتب‌سازی دستی).
 *
 * مرتب‌سازی تک‌ستونی است: `sorting` یک `{ id, desc }` است یا `null`.
 *
 * @param sortable     برای endpointهایی که مرتب‌سازی ندارند `false` بدهید
 *                     تا سرتیترها دکمه‌ی مرده نشان ندهند.
 * @param emptyMessage متنِ ردیفِ خالی *داخلِ* جدول.
 * @param emptyState   جایگزینِ کاملِ جدول وقتی ردیفی نیست.
 * @param rowClassName `(row) => string` برای رنگ‌آمیزی شرطی ردیف.
 * @param getRowKey    `(row) => key`، وقتی کلیدِ ترکیبی لازم است.
 * @param totalCount   تعدادِ کلِ نتایج (کنارِ صفحه‌بندی نشان داده می‌شود).
 */
export default function DataTable({
  data,
  columns,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
  sortable = true,
  emptyMessage = "موردی یافت نشد.",
  emptyState,
  rowClassName,
  getRowKey,
  totalCount,
}) {
  const isMobile = useIsMobile();
  const sortingState = useMemo(() => (sorting ? [sorting] : []), [sorting]);

  const handleSortingChange = useCallback(
    (updater) => {
      const next =
        typeof updater === "function" ? updater(sortingState) : updater;
      onSortingChange?.(next[0] ?? null);
    },
    [sortingState, onSortingChange],
  );

  const paginationState = useMemo(
    () => ({ pageIndex: currentPage, pageSize }),
    [currentPage, pageSize],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting: sortingState, pagination: paginationState },
    // مرتب‌سازی سرور-ساید است؛ اگر endpoint آن را نگیرد، سرتیترِ قابل‌کلیک
    // فقط به کاربر دروغ می‌گوید (کلیک می‌کند و هیچ‌چیز عوض نمی‌شود).
    enableSorting: sortable,
    onSortingChange: handleSortingChange,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  if (isLoading) return <TableLoadingSkeleton cards={isMobile} />;

  const rows = table.getRowModel().rows;

  // بعضی صفحه‌ها به‌جای ردیف خالی، یک بلوک کامل جایگزین جدول نشان می‌دهند.
  if (rows.length === 0 && emptyState) return emptyState;

  if (isMobile) {
    return (
      <div className="space-y-3">
        <MobileRowCards
          table={table}
          rows={rows}
          emptyMessage={emptyMessage}
          rowClassName={rowClassName}
          getRowKey={getRowKey}
          totalCount={totalCount}
        />
        <DataTablePagination
          totalPages={totalPages}
          currentPage={currentPage}
          pageSize={pageSize}
          onPaginationChange={onPaginationChange}
          totalCount={totalCount}
          compact
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* سرتیتر هنگامِ اسکرولِ داخلیِ جدول ثابت می‌ماند. */}
      <div className="max-h-[calc(100dvh-300px)] min-h-64 overflow-auto rounded-lg border custom-scroll [&>[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur supports-backdrop-filter:bg-muted/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();

                    return (
                      <TableHead key={header.id} className="h-11 text-center text-xs font-semibold text-muted-foreground">
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              isSortable
                                ? "flex items-center justify-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors"
                                : "flex items-center justify-center gap-1"
                            }
                            onClick={
                              isSortable
                                ? header.column.getToggleSortingHandler()
                                : undefined
                            }
                            role={isSortable ? "button" : undefined}
                            tabIndex={isSortable ? 0 : undefined}
                            onKeyDown={
                              isSortable
                                ? (e) =>
                                    e.key === "Enter" &&
                                    header.column.getToggleSortingHandler()(e)
                                : undefined
                            }
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {isSortable && <SortIcon direction={sortDir} />}
                          </div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow
                    key={getRowKey ? getRowKey(row) : row.id}
                    className={`even:bg-muted/20 hover:bg-muted/50 transition-colors ${
                      rowClassName?.(row) ?? ""
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5 text-center">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>

      <DataTablePagination
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        onPaginationChange={onPaginationChange}
        totalCount={totalCount}
      />
    </div>
  );
}
