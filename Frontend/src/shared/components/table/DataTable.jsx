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

/**
 * پوسته‌ی مشترک جدول‌های سرور-ساید (صفحه‌بندی و مرتب‌سازی دستی).
 *
 * props:
 *  data, columns          - تعریف ستون‌ها و داده‌ی همان صفحه
 *  isLoading              - نمایش اسکلتون به‌جای کل جدول
 *  totalPages, currentPage, pageSize, onPaginationChange
 *  sorting                - آبجکت { id, desc } یا null (تک‌ستونی)
 *  onSortingChange        - (nextSortingOrNull) => void
 *  emptyMessage           - متن ردیف خالی داخل جدول
 *  emptyState             - جایگزین کامل جدول وقتی ردیفی نیست (اختیاری)
 *  rowClassName           - (row) => string برای رنگ‌آمیزی شرطی ردیف
 *  getRowKey              - (row) => key در صورت نیاز به کلید ترکیبی
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
  emptyMessage = "موردی یافت نشد.",
  emptyState,
  rowClassName,
  getRowKey,
}) {
  const sortingState = useMemo(() => (sorting ? [sorting] : []), [sorting]);

  const handleSortingChange = useCallback(
    (updater) => {
      const next =
        typeof updater === "function" ? updater(sortingState) : updater;
      onSortingChange(next[0] ?? null);
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
    onSortingChange: handleSortingChange,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  if (isLoading) return <TableLoadingSkeleton />;

  const rows = table.getRowModel().rows;

  // بعضی صفحه‌ها به‌جای ردیف خالی، یک بلوک کامل جایگزین جدول نشان می‌دهند.
  if (rows.length === 0 && emptyState) return emptyState;

  return (
    <div className="space-y-3">
      <div className="h-[calc(90vh-320px)] overflow-auto custom-scroll">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();

                    return (
                      <TableHead key={header.id} className="text-center">
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
                    className={`hover:bg-muted/50 transition-colors ${
                      rowClassName?.(row) ?? ""
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-center">
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
      </div>

      <DataTablePagination
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        onPaginationChange={onPaginationChange}
      />
    </div>
  );
}
