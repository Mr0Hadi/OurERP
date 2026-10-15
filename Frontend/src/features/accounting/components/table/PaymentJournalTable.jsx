import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import StatusBadge from "@/shared/components/status/StatusBadge";
import PaymentTypeBadge from "@/shared/components/status/PaymentTypeBadge";
import { PaymentDirectionEnum, PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { DateCell, InvoiceLink, PartyLink, PartyTypeBadge } from "./cells";
import { PAYMENT_PURPOSE_FILTER_LABELS } from "../../domain/paymentPurpose";

/** مبلغ با جهت: ورود به ما سبز با «+»، خروج قرمز با «−»؛ ردیفِ باطل خط‌خورده. */
function SignedAmount({ payment }) {
  const isIn = payment.direction === PaymentDirectionEnum.IN;
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums",
        payment.voidedAt ? "text-muted-foreground line-through" : isIn ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-label={isIn ? "دریافت" : "پرداخت"} />
      {formatNumber(payment.amount)}
    </span>
  );
}

/** شماره‌ی پیگیریِ هر روش: چک، حواله یا دستگاهِ کارتخوان. */
function ReferenceCell({ payment }) {
  const parts = [
    payment.checkNumber && `چک ${payment.checkNumber}`,
    payment.transferRef && `پیگیری ${payment.transferRef}`,
    payment.posTerminalName && `کارتخوان ${payment.posTerminalName}`,
  ].filter(Boolean);
  if (parts.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col items-center gap-0.5 text-[11px]">
      {parts.map((part) => (
        <span key={part} className="whitespace-nowrap">
          {part}
        </span>
      ))}
    </div>
  );
}

const columns = [
  {
    id: "paidAt",
    meta: { mobile: "subtitle" },
    accessorKey: "paidAt",
    header: "تاریخ پرداخت",
    cell: (info) => <DateCell value={info.getValue()} />,
  },
  {
    id: "amount",
    meta: { mobile: "highlight" },
    accessorKey: "amount",
    header: "مبلغ",
    cell: ({ row }) => <SignedAmount payment={row.original} />,
  },
  {
    id: "type",
    header: "روش",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex flex-col items-center gap-1">
        <PaymentTypeBadge type={row.original.type} />
        {row.original.purpose !== PaymentPurposeEnum.NORMAL && (
          <span className="text-[10px] text-muted-foreground">{PAYMENT_PURPOSE_FILTER_LABELS[row.original.purpose]}</span>
        )}
        {row.original.voidedAt && (
          <StatusBadge tone="danger" size="sm">
            باطل‌شده
          </StatusBadge>
        )}
      </div>
    ),
  },
  {
    id: "partyName",
    meta: { mobile: "title" },
    accessorKey: "partyName",
    header: "طرف حساب",
    cell: ({ row }) => (
      <div className="flex min-w-32 flex-col items-start gap-1 text-start">
        <PartyLink partyType={row.original.partyType} partyId={row.original.partyId} name={row.original.partyName} />
        <PartyTypeBadge partyType={row.original.partyType} />
      </div>
    ),
  },
  {
    id: "invoice",
    header: "سند",
    enableSorting: false,
    cell: ({ row }) => (
      <InvoiceLink saleId={row.original.saleId} purchaseId={row.original.purchaseId} invoiceNumber={row.original.invoiceNumber} />
    ),
  },
  {
    id: "reference",
    header: "پیگیری",
    enableSorting: false,
    cell: ({ row }) => <ReferenceCell payment={row.original} />,
  },
  {
    id: "recordedAt",
    accessorKey: "recordedAt",
    header: "ثبت",
    cell: ({ row }) => (
      <div className="flex flex-col items-center gap-0.5">
        <DateCell value={row.original.recordedAt} />
        {row.original.recordedByName && (
          <span className="whitespace-nowrap text-[10px] text-muted-foreground">{row.original.recordedByName}</span>
        )}
      </div>
    ),
  },
];

/**
 * ردیف‌های پرداختِ فروش و خرید (اقساط هم). ردیفِ باطل‌شده فقط با «باطل‌شده‌ها هم» می‌آید،
 * کم‌رنگ است و در جمع‌ها نیست.
 */
export default function PaymentJournalTable(props) {
  return (
    <DataTable
      {...props}
      columns={columns}
      getRowKey={(row) => row.original.id}
      rowClassName={({ original }) => (original.voidedAt ? "opacity-60" : "")}
      emptyMessage="پرداختی با این فیلترها نیست."
    />
  );
}
