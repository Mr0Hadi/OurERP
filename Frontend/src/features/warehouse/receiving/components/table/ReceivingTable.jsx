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
  CheckCircle,
  ClipboardCheck,
  Truck,
  Undo2,
} from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { gregorianToPersian } from "@/shared/utils/dateUtils";
import { ROUTES } from "@/shared/constants/routes";
import {
  INCOMING_TYPES,
  INCOMING_TYPE_LABELS,
} from "../../services/incomingQueueApi";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50];

const TYPE_STYLES = {
  [INCOMING_TYPES.PURCHASE]:
    "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100",
  [INCOMING_TYPES.SALES_RETURN]:
    "bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-100",
};

const TYPE_ICON = {
  [INCOMING_TYPES.PURCHASE]: Truck,
  [INCOMING_TYPES.SALES_RETURN]: Undo2,
};

const TypeBadge = ({ type }) => {
  const Icon = TYPE_ICON[type] ?? Truck;
  return (
    <Badge
      className={`gap-1 ${TYPE_STYLES[type] ?? "bg-gray-100 text-gray-800"}`}
    >
      <Icon className="h-3 w-3" />
      {INCOMING_TYPE_LABELS[type] ?? type}
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

const ReceivingTable = ({
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
    [sortingState, onSortingChange],
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "refNumber",
        header: "شماره",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "counterpartyName",
        header: "طرف حساب",
        cell: (info) => <span className="font-light">{info.getValue()}</span>,
      },
      {
        accessorKey: "date",
        header: "تاریخ",
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {gregorianToPersian(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "نوع",
        enableSorting: false,
        cell: (info) => <TypeBadge type={info.getValue()} />,
      },
      {
        accessorKey: "itemsCount",
        header: "تعداد اقلام",
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {info.getValue().toLocaleString("fa-IR")}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "مبلغ (ریال)",
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {info.getValue().toLocaleString("fa-IR")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "عملیات",
        enableSorting: false,
        cell: ({ row }) => {
          const isReturn = row.original.type === INCOMING_TYPES.SALES_RETURN;
          const path = isReturn
            ? ROUTES.WAREHOUSE_RECEIVING_RETURN_DETAIL.replace(
                ":id",
                row.original.id,
              )
            : ROUTES.WAREHOUSE_RECEIVING_DETAIL.replace(":id", row.original.id);
          return (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(path)}
                className="gap-1"
              >
                {isReturn ? (
                  <ClipboardCheck className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isReturn ? "بررسی و دریافت" : "بررسی و دریافت"}
              </Button>
            </div>
          );
        },
      },
    ],
    [navigate],
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

  if (isLoading) return <LoadingSkeleton />;

  const rows = table.getRowModel().rows;
  const isLastPage = currentPage + 1 >= totalPages;

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
                    key={`${row.original.type}-${row.original.id}`}
                    className="hover:bg-muted/50 transition-colors"
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
                    چیزی برای دریافت یافت نشد.
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

export default ReceivingTable;
