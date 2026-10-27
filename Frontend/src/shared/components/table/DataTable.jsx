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
import RefreshButton from "./RefreshButton";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import { useTableFit } from "./useTableFit";

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
 * @param refresh      کوئریِ فهرست (`{ refetch, isFetching }`)؛ اگر باشد دکمه‌ی «تازه‌سازی»
 *                     می‌آید: دسکتاپ در گوشه‌ی سرتیترِ چسبانِ جدول (ستونِ باریکِ اول، راست در RTL؛ با
 *                     اسکرولِ جدول هم در دید)، موبایل در نوارِ بالای کارت‌ها کنارِ مرتب‌سازی.
 *                     `ServerTable` خودش آن را می‌دهد. ستونی با `meta.corner` (مثلاً چک‌باکسِ انتخاب) در همین
 *                     ستونِ گوشه می‌نشیند — زیرِ دکمه، مثلِ صفحه‌ی دانه‌ها — نه یک ستونِ جدا و خالیِ دیگر.
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
  refresh,
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

  // ستونِ گوشه فقط وقتی دکمه‌ی تازه‌سازی هست؛ وگرنه ستونی معمولی است.
  const cornerId = refresh ? columns.find((column) => column.meta?.corner)?.id : undefined;

  // جدولی که در عرضِ قاب جا نمی‌شود (تبلت، سایدبارِ باز) کارت می‌شود، نه اینکه از قاب بیرون بزند.
  const fit = useTableFit(`${currentPage}|${pageSize}|${data.length}|${columns.length}`);
  const showCards = isMobile || fit.tooNarrow;
  // قابِ همیشگی: ResizeObserverِ `useTableFit` عرض را از همین می‌خواند، در هر حالت.
  const frame = (node) => (
    <div ref={fit.wrapRef} className="min-w-0">
      {node}
    </div>
  );

  if (isLoading) return frame(<TableLoadingSkeleton cards={showCards} />);

  const rows = table.getRowModel().rows;

  // بعضی صفحه‌ها به‌جای ردیف خالی، یک بلوک کامل جایگزین جدول نشان می‌دهند.
  if (rows.length === 0 && emptyState) {
    if (!refresh) return frame(emptyState);
    return frame(
      <div className="space-y-2">
        <div className="flex justify-end">
          <RefreshButton query={refresh} variant={showCards ? "pill" : "icon"} />
        </div>
        {emptyState}
      </div>,
    );
  }

  if (showCards) {
    return frame(
      <div className="space-y-3">
        <MobileRowCards
          table={table}
          sorting={sortingState}
          rows={rows}
          emptyMessage={emptyMessage}
          rowClassName={rowClassName}
          getRowKey={getRowKey}
          totalCount={totalCount}
          refresh={refresh}
        />
        <DataTablePagination
          totalPages={totalPages}
          currentPage={currentPage}
          pageSize={pageSize}
          onPaginationChange={onPaginationChange}
          totalCount={totalCount}
          compact
        />
      </div>,
    );
  }

  return frame(
    <div className="space-y-3">
      {/* سرتیتر هنگامِ اسکرولِ داخلیِ جدول ثابت می‌ماند. بی‌کمینه‌ی ارتفاع: جدولِ یکی‌دو ردیفه زیرش فضای خالی داشت.
          `scrollbarGutter: auto`: `custom-scroll` جای اسکرول‌بار را همیشه نگه می‌دارد (`stable`) و سمتِ راستِ هر
          جدول، حتی بی‌اسکرول، حدودِ ۱۰px خالی می‌ماند. */}
      <div
        ref={fit.scrollerRef}
        className="max-h-[calc(100dvh-300px)] overflow-auto rounded-lg border custom-scroll [&>[data-slot=table-container]]:overflow-visible"
        style={{ scrollbarGutter: "auto" }}
      >
          <Table ref={fit.tableRef}>
            {/* پس‌زمینه‌ی کدر، نه `backdrop-blur`: کروم عنصرِ دارای backdrop-filter را با گوشه‌ی گردِ قاب نمی‌بُرد و
                گوشه‌ی چپِ سرتیتر از قاب بیرون می‌زد. */}
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup, groupIndex, groups) => (
                <TableRow key={headerGroup.id}>
                  {/* گوشه‌ی سرتیتر (راست در RTL): تازه‌سازی، بی‌ردیفِ اضافه. */}
                  {refresh && (
                    <TableHead className="h-11 w-11 px-1.5 text-center">
                      {groupIndex === groups.length - 1 && (
                        <RefreshButton query={refresh} variant="header" />
                      )}
                    </TableHead>
                  )}
                  {headerGroup.headers.filter((header) => header.column.id !== cornerId).map((header) => {
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
                    {refresh && (
                      <TableCell className="px-1.5 py-2.5 text-center">
                        {cornerId &&
                          row.getVisibleCells()
                            .filter((cell) => cell.column.id === cornerId)
                            .map((cell) => (
                              <div key={cell.id} className="flex justify-center">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            ))}
                      </TableCell>
                    )}
                    {row.getVisibleCells().filter((cell) => cell.column.id !== cornerId).map((cell) => (
                      // `whitespace-normal`: `TableCell`ِ shadcn یک‌خطی است و جدولی که ستون‌هایش جا نمی‌شد از قاب
                      // بیرون می‌زد (قابِ `custom-scroll` به سمتِ چپ اسکرول نمی‌شود)؛ حالا متن دو خط می‌شود. عدد
                      // (بی‌فاصله) و نشان‌ها (`Badge` خودش nowrap است) نمی‌شکنند.
                      <TableCell key={cell.id} className="py-2.5 text-center whitespace-normal">
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
                    colSpan={columns.length + (refresh && !cornerId ? 1 : 0)}
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
