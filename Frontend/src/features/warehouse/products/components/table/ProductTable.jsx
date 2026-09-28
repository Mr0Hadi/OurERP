import StatusBadge from "@/shared/components/status/StatusBadge";
import DataTable from "@/shared/components/table/DataTable";
import { detailsColumn } from "@/shared/components/table/columns";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";

/** موجودی: صفر قرمز، زیرِ آستانه‌ی هشدار کهربایی، بقیه سبز. */
function StockBadge({ stock, threshold = 10 }) {
  const tone = stock <= 0 ? "danger" : stock <= threshold ? "warning" : "success";
  return <StatusBadge tone={tone}>{formatNumber(stock)} عدد</StatusBadge>;
}

// ستون‌ها به هیچ state ای وابسته نیستند، پس یک بار بیرون از کامپوننت ساخته می‌شوند.
const COLUMNS = [
  {
    accessorKey: "code",
    header: "کد کالا",
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">
        {info.getValue()}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "نام قطعه",
    cell: (info) => (
      <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
        <span className="font-light">{info.getValue()}</span>
        {info.row.original.isIncomplete && (
          <StatusBadge tone="warning" size="sm">
            ناقص
          </StatusBadge>
        )}
      </span>
    ),
  },
  { accessorKey: "brand", header: "برند" },
  { accessorKey: "categoryName", header: "دسته‌بندی" },
  {
    accessorKey: "retailPrice",
    header: "قیمت (ریال)",
    cell: (info) => (
<span className="tabular-nums">{formatNumber(info.getValue())}</span>
    ),
  },
  {
    accessorKey: "stock",
    header: "موجودی",
    cell: (info) => (
      <span className="inline-flex flex-col items-center gap-0.5">
        <StockBadge
          stock={info.getValue()}
          threshold={info.row.original.lowStockThreshold}
        />
        {/* قرنطینه جزو موجودی نیست ولی فیزیکاً در انبار است. */}
        {info.row.original.quarantinedCount > 0 && (
          <span className="text-[11px] text-caution">
            قرنطینه: {formatNumber(info.row.original.quarantinedCount)}
          </span>
        )}
      </span>
    ),
  },
  detailsColumn((product) => routeWithId(ROUTES.WAREHOUSE_PRODUCTS_DETAIL, product.id)),
];

/** جدول کالاها؛ صفحه‌بندی و مرتب‌سازی سمت سرور (props همان `DataTable`). */
export default function ProductTable(props) {
  return <DataTable columns={COLUMNS} emptyMessage="کالایی یافت نشد." {...props} />;
}
