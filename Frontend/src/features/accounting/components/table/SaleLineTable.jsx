import { Link } from "react-router-dom";

import DataTable from "@/shared/components/table/DataTable";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";
import { TaxCategoryEnum } from "@/shared/domain/enums/taxCategory";
import { formatNumber } from "@/shared/lib/numberFormat";
import Amount from "../Amount";
import { DateCell, InvoiceLink, PartyLink } from "./cells";

const columns = [
  {
    id: "invoiceDate",
    accessorKey: "invoiceDate",
    header: "تاریخ",
    cell: (info) => <DateCell value={info.getValue()} />,
  },
  {
    id: "invoiceNumber",
    accessorKey: "invoiceNumber",
    header: "فاکتور",
    cell: ({ row }) => (
      <div className="flex flex-col items-center gap-0.5">
        <InvoiceLink saleId={row.original.saleId} invoiceNumber={row.original.invoiceNumber} />
        <PartyLink route={ROUTES.CUSTOMERS_DETAIL} partyId={row.original.customerId} name={row.original.customerName} />
      </div>
    ),
  },
  {
    id: "productName",
    accessorKey: "productName",
    header: "کالا",
    cell: ({ row }) => (
      <div className="flex min-w-40 flex-col items-start gap-0.5 text-start">
        <Link
          to={routeWithId(ROUTES.WAREHOUSE_PRODUCTS_DETAIL, row.original.productId)}
          className="font-medium hover:text-primary hover:underline"
        >
          {row.original.productName}
        </Link>
        <span className="text-[11px] text-muted-foreground">
          <span className="font-mono" dir="ltr">{row.original.productCode}</span>
          {row.original.productCategoryName && ` · ${row.original.productCategoryName}`}
        </span>
      </div>
    ),
  },
  {
    id: "quantity",
    accessorKey: "quantity",
    header: "تعداد",
    cell: ({ row }) => {
      const { quantity, shippedQuantity, unit } = row.original;
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="tabular-nums">
            {formatNumber(quantity)} <span className="text-[11px] text-muted-foreground">{unitLabelOf(unit)}</span>
          </span>
          {shippedQuantity !== quantity && (
            <span className="text-[10px] text-muted-foreground">ارسال‌شده {formatNumber(shippedQuantity)}</span>
          )}
        </div>
      );
    },
  },
  {
    id: "unitPrice",
    accessorKey: "unitPrice",
    header: "فی",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex flex-col items-center gap-0.5">
        <Amount value={row.original.unitPrice} />
        {row.original.discountPercent > 0 && (
          <span className="text-[10px] text-success">٪{formatNumber(row.original.discountPercent)} تخفیف</span>
        )}
      </div>
    ),
  },
  {
    id: "netAmount",
    accessorKey: "netAmount",
    header: "خالص",
    cell: (info) => <Amount value={info.getValue()} />,
  },
  {
    id: "taxAmount",
    accessorKey: "taxAmount",
    header: "مالیات",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.taxCategory === TaxCategoryEnum.EXEMPT ? (
        <StatusBadge tone="neutral" size="sm">
          معاف
        </StatusBadge>
      ) : (
        <div className="flex flex-col items-center gap-0.5">
          <Amount value={row.original.taxAmount} />
          <span className="text-[10px] text-muted-foreground">٪{formatNumber(row.original.taxPercent)}</span>
        </div>
      ),
  },
  {
    id: "totalAmount",
    accessorKey: "totalAmount",
    header: "جمع",
    cell: (info) => <Amount value={info.getValue()} strong />,
  },
];

/** ریزِ اقلامِ فروش — هر قلمِ هر فاکتورِ فروش یک ردیف، با مبالغِ ذخیره‌شده روی همان قلم. */
export default function SaleLineTable(props) {
  return (
    <DataTable
      {...props}
      columns={columns}
      getRowKey={(row) => row.original.id}
      emptyMessage="قلمِ فروشی با این فیلترها نیست."
    />
  );
}
