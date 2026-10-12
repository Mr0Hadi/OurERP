import { Link } from "react-router-dom";

import DataTable from "@/shared/components/table/DataTable";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";
import { formatNumber } from "@/shared/lib/numberFormat";
import Amount from "../Amount";

const columns = [
  {
    id: "name",
    accessorKey: "name",
    header: "کالا",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="flex min-w-44 flex-col items-start gap-0.5 text-start">
          <Link
            to={routeWithId(ROUTES.WAREHOUSE_PRODUCTS_DETAIL, product.productId)}
            className="font-medium hover:text-primary hover:underline"
          >
            {product.name}
          </Link>
          <span className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            {product.productCategoryName}
            {!product.isActive && (
              <StatusBadge tone="neutral" size="sm">
                غیرفعال
              </StatusBadge>
            )}
          </span>
        </div>
      );
    },
  },
  {
    id: "code",
    accessorKey: "code",
    header: "کد",
    cell: (info) => (
      <span className="font-mono text-xs" dir="ltr">
        {info.getValue()}
      </span>
    ),
  },
  {
    id: "stock",
    accessorKey: "stock",
    header: "موجودی",
    cell: ({ row }) => {
      const { stock, ledgerQuantity, unit } = row.original;
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="whitespace-nowrap tabular-nums">
            {formatNumber(stock)} <span className="text-[11px] text-muted-foreground">{unitLabelOf(unit)}</span>
          </span>
          {/* موجودیِ کالا و مقدارِ دفترِ ارزش باید یکی باشند؛ اختلاف یعنی ارزش با مقدارِ دیگری حساب شده. */}
          {Number(ledgerQuantity) !== Number(stock) && (
            <span className="whitespace-nowrap text-[10px] text-caution" title="مقدارِ دفترِ ارزشِ موجودی با موجودیِ کالا فرق دارد">
              دفتر {formatNumber(ledgerQuantity)}
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "averageCost",
    accessorKey: "averageCost",
    header: "میانگین بها",
    cell: (info) => <Amount value={info.getValue()} />,
  },
  {
    id: "poolValue",
    accessorKey: "poolValue",
    header: "ارزش قابل فروش",
    enableSorting: false,
    cell: (info) => <Amount value={info.getValue()} />,
  },
  {
    id: "offPoolValue",
    accessorKey: "offPoolValue",
    header: "قرنطینه",
    cell: ({ row }) => (
      <div className="flex flex-col items-center gap-0.5">
        <Amount value={row.original.offPoolValue} tone="caution" />
        {row.original.quarantinedQuantity > 0 && (
          <span className="text-[10px] text-muted-foreground">{formatNumber(row.original.quarantinedQuantity)} عدد</span>
        )}
      </div>
    ),
  },
  {
    id: "totalValue",
    accessorKey: "totalValue",
    header: "ارزش کل",
    cell: (info) => <Amount value={info.getValue()} strong />,
  },
];

/**
 * ارزشِ موجودیِ هر کالا، همان‌طور که دفترِ ارزشِ موجودی آخرین بار ثبت کرده. «قرنطینه» کالایی
 * است که پولش داده شده ولی هنوز قابلِ فروش نیست (و در موجودی شمرده نمی‌شود).
 */
export default function InventoryValuationTable(props) {
  return (
    <DataTable
      {...props}
      columns={columns}
      getRowKey={(row) => row.original.productId}
      emptyMessage="کالایی با این فیلترها نیست."
    />
  );
}
