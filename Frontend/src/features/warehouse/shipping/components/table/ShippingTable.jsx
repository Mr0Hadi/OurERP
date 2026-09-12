import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import PaymentProgress from "@/shared/components/table/PaymentProgress";
import SaleStatusBadge from "@/features/sales/orders/components/table/SaleStatusBadge";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { ROUTES } from "@/shared/constants/routes";

// ردیف‌های این صف همان `SaleListDto`اند، پس شناسه‌ی فروش کلید است.
const getRowKey = (row) => row.original.id;

const ShippingTable = ({
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
        accessorKey: "customerName",
        header: "مشتری",
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
          <SaleStatusBadge status={info.getValue()} />
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
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(
                ROUTES.WAREHOUSE_SHIPPING_DETAIL.replace(":id", row.original.id),
              )
            }
            className="gap-1"
          >
            <Truck className="h-4 w-4" />
            آماده‌سازی و ارسال
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
      emptyMessage="فروشی در انتظار ارسال نیست."
      getRowKey={getRowKey}
    />
  );
};

export default ShippingTable;
