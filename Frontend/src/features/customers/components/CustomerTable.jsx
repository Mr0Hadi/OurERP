import DataTable from "@/shared/components/table/DataTable";
import { detailsColumn } from "@/shared/components/table/columns";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import LedgerBalanceBadge from "@/features/partyAccount/components/LedgerBalanceBadge";
import { partyBalanceOf } from "@/features/partyAccount/domain/partyBalance";

// ستون‌ها به هیچ state ای وابسته نیستند، پس یک بار بیرون از کامپوننت ساخته می‌شوند.
const COLUMNS = [
  {
    accessorKey: "id",
    header: "کد مشتری",
    cell: (info) => (
      <span className="font-mono text-lg text-muted-foreground">{info.getValue()}</span>
    ),
  },
  {
    id: "fullName",
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: "نام و نام‌خانوادگی",
    cell: (info) => <span className="font-light text-lg">{info.getValue()}</span>,
  },
  {
    // مانده‌ی دفتر حساب اشخاص (یا مانده‌ی دستی، اگر سرور هنوز دفتر ندارد).
    // سرور روی آن مرتب نمی‌کند.
    id: "ledgerBalance",
    accessorFn: partyBalanceOf,
    header: "مانده حساب",
    enableSorting: false,
    cell: (info) => (
      <LedgerBalanceBadge
        balance={info.getValue()}
        className="font-light text-lg px-3 py-4 rounded-full"
      />
    ),
  },
  detailsColumn((customer) => routeWithId(ROUTES.CUSTOMERS_DETAIL, customer.id)),
];

/** جدول مشتریان؛ صفحه‌بندی و مرتب‌سازی سمت سرور (props همان `DataTable`). */
export default function CustomerTable(props) {
  return <DataTable columns={COLUMNS} emptyMessage="مشتری‌ای یافت نشد." {...props} />;
}
