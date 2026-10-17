import { Link } from "react-router-dom";
import { ListOrdered } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import { Button } from "@/shared/components/ui/button";
import { formatPercent } from "@/shared/components/charts/chartUtils";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";
import Amount from "../Amount";
import { DocumentSideEnum, TradeBreakdownGroupEnum } from "../../domain/accountingEnums";
import { withFilters } from "@/shared/hooks/useUrlPreset";

/** صفحه‌ی خودِ گروه (کالا، مشتری، تامین‌کننده)؛ دسته و کاربر صفحه‌ی جزئیاتِ حسابداری ندارند. */
function titleRouteOf(row, { side, groupBy }) {
  if (!row.id) return null;
  if (groupBy === TradeBreakdownGroupEnum.PRODUCT) return routeWithId(ROUTES.WAREHOUSE_PRODUCTS_DETAIL, row.id);
  if (groupBy === TradeBreakdownGroupEnum.PARTY) {
    return routeWithId(side === DocumentSideEnum.SALE ? ROUTES.CUSTOMERS_DETAIL : ROUTES.SUPPLIERS_DETAIL, row.id);
  }
  return null;
}

/** ریزِ پشتِ هر گروه: اقلامِ فروشِ آن کالا/دسته/مشتری، یا فاکتورهای خریدِ آن تامین‌کننده. */
function drillDownOf(row, { side, groupBy, fromDate, toDate }) {
  if (!row.id) return null;
  const range = { fromDate, toDate };
  if (side === DocumentSideEnum.SALE) {
    const key = {
      [TradeBreakdownGroupEnum.PRODUCT]: "productId",
      [TradeBreakdownGroupEnum.CATEGORY]: "productCategoryId",
      [TradeBreakdownGroupEnum.PARTY]: "customerId",
    }[groupBy];
    return key ? withFilters(ROUTES.ACCOUNTING_SALE_LINES, { ...range, [key]: row.id }) : null;
  }
  if (groupBy === TradeBreakdownGroupEnum.PARTY) {
    return withFilters(ROUTES.ACCOUNTING_PURCHASES, { ...range, supplierId: row.id });
  }
  return null;
}

function columnsFor(context) {
  return [
    {
      id: "title",
      meta: { mobile: "title" },
      accessorKey: "title",
      header: "عنوان",
      cell: ({ row }) => {
        const route = titleRouteOf(row.original, context);
        const title = row.original.title || (row.original.id === 0 ? "بدونِ کاربر" : "—");
        return (
          <div className="flex min-w-40 flex-col items-start gap-0.5 text-start">
            {route ? (
              <Link to={route} className="font-medium hover:text-primary hover:underline">
                {title}
              </Link>
            ) : (
              <span className="font-medium">{title}</span>
            )}
            {row.original.code && (
              <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                {row.original.code}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "invoiceCount",
      accessorKey: "invoiceCount",
      header: "فاکتور",
      cell: (info) => <span className="tabular-nums">{formatNumber(info.getValue())}</span>,
    },
    {
      id: "quantity",
      accessorKey: "quantity",
      header: "تعداد",
      cell: (info) => <span className="tabular-nums">{formatNumber(info.getValue())}</span>,
    },
    {
      id: "discountAmount",
      accessorKey: "discountAmount",
      header: "تخفیف",
      enableSorting: false,
      cell: (info) => <Amount value={info.getValue()} />,
    },
    {
      id: "netAmount",
      meta: { mobile: "highlight" },
      accessorKey: "netAmount",
      header: "خالص",
      cell: ({ row }) => {
        const share = Math.max(0, Math.min(100, Number(row.original.netSharePercent) || 0));
        return (
          <div className="flex min-w-28 flex-col items-center gap-1">
            <Amount value={row.original.netAmount} strong />
            <div className="flex w-full items-center gap-1.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
              </div>
              <span className="w-10 text-end text-[10px] tabular-nums text-muted-foreground">
                {formatPercent(row.original.netSharePercent)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: "taxAmount",
      accessorKey: "taxAmount",
      header: "مالیات",
      enableSorting: false,
      cell: (info) => <Amount value={info.getValue()} />,
    },
    {
      id: "totalAmount",
      accessorKey: "totalAmount",
      header: "جمع",
      cell: (info) => <Amount value={info.getValue()} />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">ریز</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const to = drillDownOf(row.original, context);
        return to ? (
          <Button asChild variant="ghost" size="icon-sm" title="ریزِ این گروه">
            <Link to={to} aria-label="ریزِ این گروه">
              <ListOrdered />
            </Link>
          </Button>
        ) : null;
      },
    },
  ];
}

/**
 * فروش یا خرید به تفکیکِ یک گروه. نوارِ زیرِ «خالص» سهمِ گروه از خالصِ کلِ دوره است
 * (`netSharePercent`ِ سرور، بدونِ اعمالِ جست‌وجو).
 *
 * @param context `{ side, groupBy, fromDate, toDate }` — برای لینکِ عنوان و ریزِ هر ردیف
 */
export default function TradeBreakdownTable({ context, ...props }) {
  return (
    <DataTable
      {...props}
      columns={columnsFor(context)}
      getRowKey={(row) => `${context.side}-${context.groupBy}-${row.original.id}`}
      emptyMessage="در این بازه فاکتوری نیست."
    />
  );
}
