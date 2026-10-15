import DataTable from "@/shared/components/table/DataTable";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { PartyLedgerDirectionEnum, PartyLedgerEntryTypeEnum } from "@/shared/domain/enums/partyLedger";
import { formatDigits, formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { DateCell, InvoiceLink, PartyLink, PartyTypeBadge } from "./cells";

/** مبلغِ ردیف با جهتش: «بد» یعنی طرف به ما بدهکارتر شد، «بس» برعکس. */
function DirectedAmount({ entry }) {
  const isDebit = entry.direction === PartyLedgerDirectionEnum.DEBIT;
  const amount = isDebit ? entry.debit : entry.credit;
  return (
    <span className={cn("whitespace-nowrap tabular-nums font-medium", isDebit ? "text-warning" : "text-info")}>
      {formatNumber(amount)}
      <span className="ms-1 text-[10px] font-normal opacity-80">{isDebit ? "بد" : "بس"}</span>
    </span>
  );
}

const columns = [
  {
    id: "occurredAt",
    meta: { mobile: "subtitle" },
    accessorKey: "occurredAt",
    header: "تاریخ",
    cell: (info) => <DateCell value={info.getValue()} />,
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
    id: "entry",
    header: "شرح",
    enableSorting: false,
    cell: ({ row }) => {
      const entry = row.original;
      return (
        <div className="flex min-w-48 max-w-80 flex-col items-start gap-1 text-start">
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge tone={entry.entryType === PartyLedgerEntryTypeEnum.REVERSAL ? "danger" : "neutral"} size="sm">
              {entry.entryTypeTitle}
            </StatusBadge>
            {entry.paymentType != null && (
              <StatusBadge tone="info" size="sm">
                {PAYMENT_TYPE_LABELS[entry.paymentType] ?? entry.paymentType}
              </StatusBadge>
            )}
            {entry.isReversed && (
              <StatusBadge tone="danger" size="sm">
                برگشت‌خورده
              </StatusBadge>
            )}
            {entry.reversalOfEntryId && (
              <span className="text-[11px] text-muted-foreground">برگشتِ ردیف {formatDigits(entry.reversalOfEntryId)}</span>
            )}
          </div>
          {entry.description && <span className="text-xs leading-5 text-muted-foreground">{entry.description}</span>}
        </div>
      );
    },
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
    id: "amount",
    meta: { mobile: "highlight" },
    // مرتب‌سازی سمتِ سرور است؛ accessor فقط برای اینکه TanStack ستون را قابلِ مرتب‌سازی بداند.
    accessorFn: (entry) => entry.debit || entry.credit,
    header: "مبلغ",
    cell: ({ row }) => <DirectedAmount entry={row.original} />,
  },
  {
    id: "id",
    meta: { mobile: "hidden" },
    accessorKey: "id",
    header: "ردیف",
    enableSorting: false,
    cell: (info) => <span className="text-[11px] tabular-nums text-muted-foreground">{formatDigits(info.getValue())}</span>,
  },
];

/**
 * ردیف‌های دفترِ اشخاص. مانده‌ی جاری ندارد (صفحه‌بندی‌شده است؛ گردش با مانده‌ی یک نفر در
 * صفحه‌ی همان مشتری/تامین‌کننده است). ردیفِ برگشت‌خورده و ردیفِ برگشت کم‌رنگ‌اند.
 */
export default function PartyLedgerTable(props) {
  return (
    <DataTable
      {...props}
      columns={columns}
      getRowKey={(row) => row.original.id}
      rowClassName={({ original }) =>
        original.isReversed || original.entryType === PartyLedgerEntryTypeEnum.REVERSAL ? "opacity-60" : ""
      }
      emptyMessage="ردیفی با این فیلترها در دفتر نیست."
    />
  );
}
