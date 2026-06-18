// features/inventory/components/ProductTable.jsx

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
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50];

const StockBadge = ({ stock }) => {
  if (stock <= 0) return <Badge variant="destructive">{stock} عدد</Badge>;
  if (stock < 10)
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
        {stock} عدد
      </Badge>
    );
  return <Badge variant="default">{stock} عدد</Badge>;
};

const SortIcon = ({ direction }) => {
  if (direction === "asc") return <ArrowUp className="h-4 w-4" />;
  if (direction === "desc") return <ArrowDown className="h-4 w-4" />;
  return <ArrowUpDown className="h-4 w-4 opacity-40" />;
};

const LoadingSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
);

const ProductTable = ({
  data,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
}) => {
  const navigate = useNavigate();

  const sortingState = useMemo(() => (sorting ? [sorting] : []), [sorting]);

  const handleSortingChange = useCallback(
    (updater) => {
      const next =
        typeof updater === "function" ? updater(sortingState) : updater;
      onSortingChange(next[0] ?? null);
    },
    [sortingState, onSortingChange]
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "sku",
        header: "کد کالا",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "نام قطعه",
        cell: (info) => (
          <span className="font-light">{info.getValue()}</span>
        ),
      },
      { accessorKey: "brand", header: "برند" },
      { accessorKey: "category", header: "دسته‌بندی" },
      {
        accessorKey: "price",
        header: "قیمت (تومان)",
        cell: (info) => (
          <span className="tabular-nums">
            {Number(info.getValue()).toLocaleString("fa-IR")}
          </span>
        ),
      },
      {
        accessorKey: "stock",
        header: "موجودی",
        cell: (info) => <StockBadge stock={info.getValue()} />,
      },
      {
        id: "actions",
        header: "جزئیات",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/products/${row.original.id}`)}
          >
            جزئیات بیشتر
          </Button>
        ),
      },
    ],
    [navigate]
  );

  const paginationState = useMemo(
    () => ({ pageIndex: currentPage, pageSize }),
    [currentPage, pageSize]
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

  if (isLoading) return <LoadingSkeleton />;

  const rows = table.getRowModel().rows;
  const isLastPage = currentPage + 1 >= totalPages;

  return (
    <div className="space-y-3">
      <div className="h-[calc(90vh-300px)] overflow-auto custom-scroll">
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
                              header.getContext()
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
                    key={row.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-center">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
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
                    محصولی یافت نشد.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

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
    </div>
  );
};

export default ProductTable;
