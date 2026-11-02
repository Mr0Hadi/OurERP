import DataTable from "@/shared/components/table/DataTable";
import { detailsColumn } from "@/shared/components/table/columns";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import LedgerBalanceBadge from "@/features/partyAccount/components/LedgerBalanceBadge";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { partyBalanceOf } from "@/features/partyAccount/domain/partyBalance";

/** «فقط نقدی» برای سقفِ صفر، «بالای سقف» وقتی بدهیِ مؤثر از سقف گذشته؛ بی‌سقف چیزی نشان نمی‌دهد. */
function CreditLimitBadge({ customer }) {
  if (customer.creditLimit == null) return null;
  if (Number(customer.creditLimit) === 0) return <StatusBadge tone="neutral">فقط نقدی</StatusBadge>;
  if (Number(customer.creditAvailable) < 0) return <StatusBadge tone="danger">بالای سقفِ اعتبار</StatusBadge>;
  return null;
}

// ستون‌ها به هیچ state ای وابسته نیستند، پس یک بار بیرون از کامپوننت ساخته می‌شوند.
const COLUMNS = [
  {
    accessorKey: "id",
    meta: { mobile: "subtitle" },
    header: "کد مشتری",
    cell: (info) => (
      <span className="font-mono text-lg text-muted-foreground">{info.getValue()}</span>
    ),
  },
  {
    id: "fullName",
    meta: { mobile: "title" },
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: "نام و نام‌خانوادگی",
    cell: (info) => <span className="font-light text-lg">{info.getValue()}</span>,
  },
  {
    // مانده‌ی دفتر حساب اشخاص، و نشانِ سقفِ اعتبار (GAP-06: `creditLimit`/`creditAvailable` روی ردیف).
    // سرور روی آن مرتب نمی‌کند.
    id: "ledgerBalance",
    meta: { mobile: "highlight" },
    accessorFn: partyBalanceOf,
    header: "مانده حساب",
    enableSorting: false,
    cell: (info) => (
      <span className="inline-flex flex-col items-start gap-1">
        <LedgerBalanceBadge
          balance={info.getValue()}
          className="font-light text-lg px-3 py-4 rounded-full"
        />
        <CreditLimitBadge customer={info.row.original} />
      </span>
    ),
  },
  detailsColumn((customer) => routeWithId(ROUTES.CUSTOMERS_DETAIL, customer.id)),
];

/** جدول مشتریان؛ صفحه‌بندی و مرتب‌سازی سمت سرور (props همان `DataTable`). */
export default function CustomerTable(props) {
  return <DataTable columns={COLUMNS} emptyMessage="مشتری‌ای یافت نشد." {...props} />;
}
