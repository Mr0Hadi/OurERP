import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import { gregorianToPersian } from "@/shared/utils/dateUtils";
import { ROUTES } from "@/shared/constants/routes";
import { PURCHASE_RETURN_REASON_LABELS } from "../../services/mockData";
import PurchaseReturnStatusBadge from "./PurchaseReturnStatusBadge";

const EMPTY_STATE = (
  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center border border-dashed border-border rounded-lg">
    <Search className="h-8 w-8 text-muted-foreground" />
    <p className="text-sm text-muted-foreground">موردی یافت نشد.</p>
  </div>
);

// کسری‌های «قابل پیگیری» هنوز مرجوعی واقعی نیستند و متمایز نشان داده می‌شوند.
const rowClassName = (row) =>
  row.original.isVirtual ? "bg-amber-50/30 dark:bg-amber-950/10" : "";

const PurchaseReturnTable = ({
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

  const columns = useMemo(
    () => [
      {
        accessorKey: "returnNumber",
        header: "شماره مرجوعی",
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="font-mono text-xs text-muted-foreground">
              {value}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              ثبت‌نشده
            </span>
          );
        },
      },
      {
        accessorKey: "purchaseInvoiceNumber",
        header: "فاکتور خرید",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div>
              <span className="font-mono text-xs text-muted-foreground block">
                {r.purchaseInvoiceNumber}
              </span>
              {/* وقتی یک خرید بیش از یک دور کسری/مرجوعی داشته باشد، این
                  نشان کمک می‌کند کاربر بفهمد این ردیف مربوط به کدام
                  دوره است و بقیه‌ی ردیف‌های هم‌خانواده‌اش کجا هستند. */}
              {r.totalRoundsForPurchase > 1 && (
                <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
                  دور {r.roundNumber.toLocaleString("fa-IR")} از{" "}
                  {r.totalRoundsForPurchase.toLocaleString("fa-IR")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "supplierName",
        header: "تامین‌کننده",
        cell: (info) => <span className="font-light">{info.getValue()}</span>,
      },
      {
        accessorKey: "returnDate",
        header: "تاریخ",
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="tabular-nums text-sm">
              {gregorianToPersian(value)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "reason",
        header: "دلیل",
        enableSorting: false,
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {PURCHASE_RETURN_REASON_LABELS[info.getValue()] ?? info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "وضعیت",
        enableSorting: false,
        cell: (info) => <PurchaseReturnStatusBadge status={info.getValue()} />,
      },
      {
        accessorKey: "totalAmount",
        header: "مبلغ (ریال)",
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {info.getValue().toLocaleString("fa-IR")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "اقدام",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          if (r.isVirtual) {
            return (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  navigate(
                    ROUTES.PURCHASES_RETURNS_NEW.replace(
                      ":purchaseId",
                      r.purchaseId,
                    ),
                  )
                }
              >
                <Undo2 className="h-3.5 w-3.5" />
                بررسی
              </Button>
            );
          }
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(ROUTES.PURCHASES_RETURNS_DETAIL.replace(":id", r.id))
              }
            >
              جزئیات
            </Button>
          );
        },
      },
    ],
    [navigate],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      totalPages={totalPages}
      currentPage={currentPage}
      pageSize={pageSize}
      onPaginationChange={onPaginationChange}
      sorting={sorting}
      onSortingChange={onSortingChange}
      emptyState={EMPTY_STATE}
      rowClassName={rowClassName}
    />
  );
};

export default PurchaseReturnTable;
