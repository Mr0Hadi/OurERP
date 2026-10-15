import { Link } from "react-router-dom";
import { BookOpenText } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import StatusBadge from "@/shared/components/status/StatusBadge";
import PaymentTypeBadge from "@/shared/components/status/PaymentTypeBadge";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { formatDigits, formatNumber } from "@/shared/lib/numberFormat";
import { toneRow } from "@/shared/lib/tone";
import Amount from "../Amount";
import { DateCell, PartyLink } from "./cells";
import { DocumentSideEnum } from "../../domain/accountingEnums";
import { withFilters } from "../../hooks/useUrlPreset";

/** مانده: معوق قرمز، باز کهربایی، اضافه‌پرداخت (منفی) آبی. */
function remainingTone(row) {
  const remaining = Number(row.remainingAmount) || 0;
  if (remaining < 0) return "info";
  if (remaining > 0) return row.overdueDays > 0 ? "danger" : "warning";
  return undefined;
}

function columnsFor(config) {
  const documentKey = config.side === DocumentSideEnum.SALE ? "saleId" : "purchaseId";

  return [
    {
      id: "invoiceNumber",
      meta: { mobile: "subtitle" },
      accessorKey: "invoiceNumber",
      header: "فاکتور",
      cell: ({ row }) => (
        <div className="flex flex-col items-center gap-1">
          <Link
            to={routeWithId(config.documentRoute, row.original.id)}
            className="font-mono text-xs text-primary hover:underline"
          >
            {row.original.invoiceNumber || `#${formatDigits(row.original.id)}`}
          </Link>
          <StatusBadge tone={config.statusTones[row.original.status]} size="sm">
            {config.statusLabels[row.original.status] ?? row.original.status}
          </StatusBadge>
        </div>
      ),
    },
    {
      id: "invoiceDate",
      meta: { mobile: "subtitle" },
      accessorKey: "invoiceDate",
      header: "تاریخ",
      cell: (info) => <DateCell value={info.getValue()} />,
    },
    {
      id: config.partyNameKey,
      meta: { mobile: "title" },
      accessorKey: config.partyNameKey,
      header: config.partyLabel,
      cell: ({ row }) => (
        <div className="flex min-w-32 flex-col items-start gap-0.5 text-start">
          <PartyLink
            route={config.partyRoute}
            partyId={row.original[config.partyIdKey]}
            name={row.original[config.partyNameKey]}
          />
          {row.original[config.userNameKey] && (
            <span className="text-[11px] text-muted-foreground">
              {config.userLabel}: {row.original[config.userNameKey]}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "paymentType",
      header: "پرداخت",
      enableSorting: false,
      cell: ({ row }) => <PaymentTypeBadge type={row.original.paymentType} />,
    },
    {
      id: "totalAmount",
      meta: { mobile: "highlight" },
      accessorKey: "totalAmount",
      header: "جمع فاکتور",
      cell: ({ row }) => {
        const invoice = row.original;
        const extra = Number(invoice[config.extraAmount.key]) || 0;
        return (
          <div className="flex flex-col items-center gap-0.5">
            <Amount value={invoice.totalAmount} strong />
            <span className="whitespace-nowrap text-[10px] text-muted-foreground">
              {formatNumber(invoice.itemCount)} قلم · مالیات {formatNumber(invoice.taxAmount)}
            </span>
            {extra !== 0 && (
              <span className="whitespace-nowrap text-[10px] text-special">
                {config.extraAmount.label} {formatNumber(extra)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "paidAmount",
      accessorKey: "paidAmount",
      header: "پرداخت‌شده",
      cell: (info) => <Amount value={info.getValue()} tone="success" />,
    },
    {
      id: "remainingAmount",
      meta: { mobile: "highlight" },
      accessorKey: "remainingAmount",
      header: "مانده",
      cell: ({ row }) => <Amount value={row.original.remainingAmount} tone={remainingTone(row.original)} strong />,
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      header: "سررسید",
      cell: ({ row }) => (
        <div className="flex flex-col items-center gap-0.5">
          <DateCell value={row.original.dueDate} />
          {row.original.overdueDays > 0 && (
            <span className="whitespace-nowrap text-[10px] text-destructive">
              {formatNumber(row.original.overdueDays)} روز گذشته
            </span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">ردیف‌های دفتر</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <Button asChild variant="ghost" size="icon-sm" title="ردیف‌های این فاکتور در دفترِ اشخاص">
          <Link
            to={withFilters(ROUTES.ACCOUNTING_PARTY_LEDGER, { [documentKey]: row.original.id })}
            aria-label="ردیف‌های این فاکتور در دفترِ اشخاص"
          >
            <BookOpenText />
          </Link>
        </Button>
      ),
    },
  ];
}

/**
 * دفترِ فروش یا خرید — هر فاکتور یک ردیف. «قابلِ پرداخت» در فروشِ اقساطی جمعِ قرارداد است
 * و در خرید بدونِ سهمِ اقلامِ بسته‌شده با کسری؛ مانده از همان حساب می‌شود. ردیفِ معوق رنگی است.
 *
 * @param config `JOURNAL_SIDES[side]`
 */
export default function InvoiceJournalTable({ config, ...props }) {
  return (
    <DataTable
      {...props}
      columns={columnsFor(config)}
      getRowKey={(row) => row.original.id}
      rowClassName={({ original }) => (original.overdueDays > 0 ? toneRow("danger") : "")}
      emptyMessage={config.emptyMessage}
    />
  );
}
