import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import PaymentProgress from "@/shared/components/table/PaymentProgress";
import PurchaseStatusBadge from "@/features/purchases/orders/components/table/PurchaseStatusBadge";
import { PURCHASE_STATUS_LABELS } from "@/shared/domain/enums/purchaseStatus";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { ROUTES } from "@/shared/constants/routes";

// ردیف‌های این صف همان `PurchaseListDto`اند، پس شناسه‌ی خرید کلید است.
const getRowKey = (row) => row.original.id;

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
        accessorKey: "invoiceNumber",
        header: "شماره فاکتور",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "supplierName",
        header: "تامین‌کننده",
        cell: (info) => <span className="font-light">{info.getValue()}</span>,
      },
      {
        accessorKey: "invoiceDate",
        header: "تاریخ فاکتور",
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {gregorianToPersian(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "وضعیت",
        enableSorting: false,
        cell: (info) => (
          <PurchaseStatusBadge
            status={info.getValue()}
            labels={PURCHASE_STATUS_LABELS}
          />
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "مبلغ (ریال)",
        enableSorting: false,
        cell: ({ row }) => (
          <PaymentProgress
            paid={row.original.paidAmount}
            total={row.original.totalAmount}
          />
        ),
      },
      {
        id: "actions",
        header: "عملیات",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  ROUTES.WAREHOUSE_RECEIVING_DETAIL.replace(
                    ":id",
                    row.original.id,
                  ),
                )
              }
              className="gap-1"
            >
              <CheckCircle className="h-4 w-4" />
              بررسی و دریافت
            </Button>
          </div>
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
      emptyMessage="خریدی در انتظار دریافت نیست."
      getRowKey={getRowKey}
    />
  );
};

export default ReceivingTable;
