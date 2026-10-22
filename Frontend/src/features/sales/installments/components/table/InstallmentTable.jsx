import { Link } from "react-router-dom";
import { HandCoins } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import { InstallmentStatusBadge } from "../InstallmentStatusBadge";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import {
  INSTALLMENT_STATUS_TONES,
  isInstallmentUnpaid,
} from "@/shared/domain/enums/saleInstallment";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatDigits, formatNumber } from "@/shared/lib/numberFormat";
import { toneRow } from "@/shared/lib/tone";

function columnsFor({ onPay }) {
  return [
    {
      accessorKey: "customerName",
      meta: { mobile: "title" },
      header: "مشتری",
      cell: (info) => <span className="font-light">{info.getValue()}</span>,
    },
    {
      accessorKey: "invoiceNumber",
      meta: { mobile: "subtitle" },
      header: "فاکتور",
      cell: ({ row }) => (
        <Link
          to={routeWithId(ROUTES.SALES_DETAIL, row.original.saleId)}
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.original.invoiceNumber || `#${formatDigits(row.original.saleId)}`}
        </Link>
      ),
    },
    {
      accessorKey: "number",
      header: "قسط",
      cell: (info) => <span className="tabular-nums">{formatDigits(info.getValue())}</span>,
    },
    {
      accessorKey: "dueDate",
      header: "سررسید",
      cell: (info) => <span className="tabular-nums text-sm">{gregorianToPersian(info.getValue())}</span>,
    },
    {
      accessorKey: "amount",
      meta: { mobile: "highlight" },
      header: "مبلغ (ریال)",
      cell: (info) => <span className="font-medium tabular-nums">{formatNumber(info.getValue())}</span>,
    },
    {
      accessorKey: "status",
      meta: { mobile: "badge" },
      header: "وضعیت",
      cell: (info) => <InstallmentStatusBadge status={info.getValue()} />,
    },
    {
      accessorKey: "paidAt",
      header: "پرداخت",
      cell: ({ row }) =>
        row.original.paidAt ? (
          <span className="text-xs tabular-nums">
            {gregorianToPersian(row.original.paidAt)}
            {row.original.paymentType != null && ` · ${PAYMENT_TYPE_LABELS[row.original.paymentType]}`}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    ...(onPay
      ? [
          {
            id: "actions",
            header: () => <span className="sr-only">دریافت</span>,
            enableSorting: false,
            cell: ({ row }) =>
              isInstallmentUnpaid(row.original.status) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => onPay(row.original)}
                >
                  <HandCoins className="size-3.5" />
                  دریافت
                </Button>
              ),
          },
        ]
      : []),
  ];
}

/**
 * فهرستِ تک‌تکِ اقساط (`ServerTable`؛ صفحه‌بندی و مرتب‌سازی سمتِ سرور). ردیفِ سررسیدگذشته
 * رنگی است.
 *
 * @param onPay `(row) => void` — بدونِ آن ستونِ «دریافت» نیست (دسترسیِ `SaleInstallmentPay`)
 */
export default function InstallmentTable({ onPay, ...tableProps }) {
  return (
    <DataTable
      {...tableProps}
      columns={columnsFor({ onPay })}
      getRowKey={(row) => row.original.installmentId}
      rowClassName={({ original }) =>
        isInstallmentUnpaid(original.status)
          ? toneRow(INSTALLMENT_STATUS_TONES[original.status])
          : ""
      }
      emptyMessage="قسطی با این فیلترها یافت نشد."
    />
  );
}
