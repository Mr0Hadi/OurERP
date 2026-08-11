import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import { gregorianToPersian } from "@/shared/utils/dateUtils";
import { ROUTES } from "@/shared/constants/routes";
import { SALES_RETURN_REASON_LABELS } from "../../services/mockData";
import SalesReturnStatusBadge from "./SalesReturnStatusBadge";

const EMPTY_STATE = (
  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center border border-dashed border-border rounded-lg">
    <Search className="h-8 w-8 text-muted-foreground" />
    <p className="text-sm text-muted-foreground">موردی یافت نشد.</p>
  </div>
);

const SalesReturnTable = ({
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
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "saleInvoiceNumber",
        header: "فاکتور فروش",
        enableSorting: false,
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "customerName",
        header: "مشتری",
        cell: (info) => <span className="font-light">{info.getValue()}</span>,
      },
      {
        accessorKey: "returnDate",
        header: "تاریخ",
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {gregorianToPersian(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "reason",
        header: "دلیل",
        enableSorting: false,
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {SALES_RETURN_REASON_LABELS[info.getValue()] ?? info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "وضعیت",
        enableSorting: false,
        cell: (info) => <SalesReturnStatusBadge status={info.getValue()} />,
      },
      {
        accessorKey: "totalClaimedAmount",
        header: "مبلغ ادعا (ریال)",
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
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(
                ROUTES.SALES_RETURNS_DETAIL.replace(":id", row.original.id),
              )
            }
          >
            جزئیات
          </Button>
        ),
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
    />
  );
};

export default SalesReturnTable;
