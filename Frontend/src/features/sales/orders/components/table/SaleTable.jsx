import { useMemo } from "react";
import DataTable from "@/shared/components/table/DataTable";
import PaymentProgress from "@/shared/components/table/PaymentProgress";
import PaymentTypeBadge from "@/shared/components/status/PaymentTypeBadge";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import SaleStatusBadge from "@/shared/components/status/SaleStatusBadge";
import { detailsColumn } from "@/shared/components/table/columns";

const SaleTable = ({
  data,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
}) => {

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
        cell: (info) => <SaleStatusBadge status={info.getValue()} />,
      },
      {
        accessorKey: "paymentType",
        header: "نوع پرداخت",
        cell: (info) => (
          <PaymentTypeBadge type={info.getValue()} />
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "مبلغ پرداخت (ریال)",
        cell: ({ row }) => (
          <PaymentProgress
            paid={row.original.paidAmount}
            // بدهی = مبلغ قابل پرداخت − پرداخت‌شده (فروش اقساطی: با سود؛
            // خرید: منهای قلم‌های بسته‌شده). لیست خرید هنوز آن را ندارد.
            total={row.original.payableAmount ?? row.original.totalAmount}
          />
        ),
      },
      detailsColumn((row) => routeWithId(ROUTES.SALES_DETAIL, row.id)),
    ],
    [],
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
      emptyMessage="فروشی یافت نشد."
    />
  );
};

export default SaleTable;
