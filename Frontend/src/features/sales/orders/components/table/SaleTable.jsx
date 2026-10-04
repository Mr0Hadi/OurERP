import DataTable from "@/shared/components/table/DataTable";
import PaymentProgress from "@/shared/components/table/PaymentProgress";
import PaymentTypeBadge from "@/shared/components/status/PaymentTypeBadge";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import SaleStatusBadge from "@/shared/components/status/SaleStatusBadge";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { detailsColumn } from "@/shared/components/table/columns";
import { formatNumber } from "@/shared/lib/numberFormat";

/** ستون‌های فهرستِ فروش — ثابتِ ماژول؛ به props وابسته نیستند. */
const COLUMNS = [
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
    // وضعیت فقط مرحله‌ی ارسال است؛ مرجوعی سندِ جداست و کنارش نشان داده
    // می‌شود (`returnCount`، و `hasOpenReturn` برای مرجوعیِ هنوز باز).
    cell: (info) => {
      const { returnCount, hasOpenReturn } = info.row.original;
      return (
        <div className="flex flex-wrap items-center gap-1">
          <SaleStatusBadge status={info.getValue()} />
          {returnCount > 0 && (
            <StatusBadge
              size="sm"
              tone={hasOpenReturn ? "caution" : "neutral"}
              title={hasOpenReturn ? "مرجوعیِ باز دارد" : "مرجوعی دارد"}
            >
              {formatNumber(returnCount)} مرجوعی
            </StatusBadge>
          )}
        </div>
      );
    },
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
];

/** جدولِ فهرستِ فروش‌ها (`ServerTable`؛ صفحه‌بندی و مرتب‌سازی سمتِ سرور). */
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


  return (
    <DataTable
      data={data}
      columns={COLUMNS}
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
