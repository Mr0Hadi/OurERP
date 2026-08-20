import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ClipboardCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import { gregorianToPersian } from "@/shared/utils/dateUtils";
import { ROUTES } from "@/shared/constants/routes";
import { INCOMING_TYPES } from "../../services/incomingQueueApi";
import ReceivingTypeBadge from "./ReceivingTypeBadge";

// خرید و مرجوعی فروش شناسه‌های مستقل دارند، پس کلید ردیف باید ترکیبی باشد.
const getRowKey = (row) => `${row.original.type}-${row.original.id}`;

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
        cell: (info) => <ReceivingTypeBadge type={info.getValue()} />,
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
                بررسی و دریافت
              </Button>
            </div>
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
      emptyMessage="چیزی برای دریافت یافت نشد."
      getRowKey={getRowKey}
    />
  );
};

export default ReceivingTable;
