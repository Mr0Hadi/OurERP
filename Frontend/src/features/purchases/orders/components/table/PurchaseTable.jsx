import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import PaymentProgress from "@/shared/components/table/PaymentProgress";
import PaymentTypeBadge from "@/shared/components/table/PaymentTypeBadge";
import { gregorianToPersian } from "@/shared/utils/dateUtils";
import { ROUTES } from "@/shared/constants/routes";
import { PURCHASE_STATUS_LABELS } from "@/shared/domain/enums/purchaseStatus";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import PurchaseStatusBadge from "./PurchaseStatusBadge";

const PurchaseTable = ({
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
        accessorKey: "paymentType",
        header: "نوع پرداخت",
        enableSorting: false,
        cell: (info) => (
          <PaymentTypeBadge
            type={info.getValue()}
            labels={PAYMENT_TYPE_LABELS}
          />
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "مبلغ پرداخت (ریال)",
        cell: ({ row }) => (
          <PaymentProgress
            paid={row.original.paidAmount}
            total={row.original.totalAmount}
          />
        ),
      },
      {
        id: "actions",
        header: "جزئیات",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(ROUTES.PURCHASES_DETAIL.replace(":id", row.original.id))
            }
          >
            جزئیات بیشتر
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
      emptyMessage="خریدی یافت نشد."
    />
  );
};

export default PurchaseTable;
