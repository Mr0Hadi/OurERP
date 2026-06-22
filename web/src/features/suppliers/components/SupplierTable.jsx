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
import { useNavigate } from "react-router-dom";
import { Badge } from "@/shared/components/ui/badge";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50];

const BalanceBadge = ({ balance }) => {
  const value = Number(balance);
  const isDebt = value > 0; // تامین کننده به ما بدهکار است
  const absValue = Math.abs(value).toLocaleString("fa-IR");

  if (isDebt) {
    return (
      <Badge className="bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100/90 dark:hover:bg-emerald-950/70 font-light text-lg px-3 py-4 rounded-full transition-colors">
        بدهکار به ما {absValue} تومان
      </Badge>
    );
  }
  if (value < 0) {
    return (
      <Badge className="bg-red-100/80 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800/50 hover:bg-red-100/90 dark:hover:bg-red-950/70 font-light text-lg px-3 py-4 rounded-full transition-colors">
        بستانکار {absValue} تومان
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground font-light text-lg px-3 py-4 rounded-full"
    >
      تسویه شده
    </Badge>
  );
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

const SupplierTable = ({
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
        accessorKey: "id",
        header: "کد تامین‌کننده",
        cell: (info) => (
          <span className="font-mono text-lg text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "companyName",
        header: "نام شرکت/فروشگاه",
        cell: (info) => (
          <span className="font-medium text-lg">{info.getValue() || "-"}</span>
        ),
      },
      {
        id: "fullName",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        header: "نام مسئول",
        cell: (info) => (
          <span className="font-light text-lg">{info.getValue() || "-"}</span>
        ),
      },
      {
        accessorKey: "balance",
        header: "تراز مالی",
        cell: (info) => <BalanceBadge balance={info.getValue()} />,
      },
      {
        id: "actions",
        header: "جزئیات",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/suppliers/${row.original.id}`)}
          >
            مدیریت
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
      <div className="h-[calc(82vh-300px)] overflow-auto custom-scroll">
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
                    تامین‌کننده‌ای یافت نشد.
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
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierTable;
