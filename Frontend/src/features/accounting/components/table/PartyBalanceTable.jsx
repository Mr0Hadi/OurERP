import { Link } from "react-router-dom";
import { BookOpenText } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";
import Amount from "../Amount";
import AgingBar from "../AgingBar";
import BalanceAmount from "../BalanceAmount";
import { DateCell, PartyLink, PartyTypeBadge } from "./cells";
import { agingOverdue } from "../../domain/aging";
import { AccountingPartyTypeEnum } from "../../domain/accountingEnums";
import { withFilters } from "@/shared/hooks/useUrlPreset";

/** گردشِ همین طرف‌حساب در دفترِ اشخاص. */
function ledgerLinkOf(row) {
  const isCustomer = row.partyType === AccountingPartyTypeEnum.CUSTOMER;
  return withFilters(ROUTES.ACCOUNTING_PARTY_LEDGER, {
    partyType: row.partyType,
    [isCustomer ? "customerId" : "supplierId"]: row.partyId,
  });
}

const columns = [
  {
    id: "name",
    meta: { mobile: "title" },
    accessorKey: "name",
    header: "طرف حساب",
    cell: ({ row }) => {
      const party = row.original;
      return (
        <div className="flex min-w-36 flex-col items-start gap-1 text-start">
          <PartyLink partyType={party.partyType} partyId={party.partyId} name={party.name} />
          <div className="flex flex-wrap items-center gap-1">
            <PartyTypeBadge partyType={party.partyType} />
            {!party.isActive && (
              <StatusBadge tone="neutral" size="sm">
                غیرفعال
              </StatusBadge>
            )}
            {party.phone && <span className="text-[11px] tabular-nums text-muted-foreground" dir="ltr">{party.phone}</span>}
          </div>
        </div>
      );
    },
  },
  {
    id: "totalDebit",
    accessorKey: "totalDebit",
    header: "جمع بدهکار",
    cell: (info) => <Amount value={info.getValue()} />,
  },
  {
    id: "totalCredit",
    accessorKey: "totalCredit",
    header: "جمع بستانکار",
    cell: (info) => <Amount value={info.getValue()} />,
  },
  {
    id: "balance",
    meta: { mobile: "highlight" },
    accessorKey: "balance",
    header: "مانده",
    cell: ({ row }) => {
      const { balance, creditLimit } = row.original;
      // سقفِ اعتبار فقط برای مشتری؛ عبور از آن هشدار است نه خطا (سرور جلوی فروش را نمی‌گیرد).
      const overLimit = Number(creditLimit) > 0 && Number(balance) > Number(creditLimit);
      return (
        <div className="flex flex-col items-center gap-0.5">
          <BalanceAmount value={balance} />
          {overLimit && (
            <span className="text-[10px] text-destructive">بیش از سقفِ اعتبار ({formatNumber(creditLimit)})</span>
          )}
        </div>
      );
    },
  },
  {
    id: "aging",
    header: "سنی‌بندی اسنادِ باز",
    enableSorting: false,
    cell: ({ row }) => {
      const { aging, openItemCount } = row.original;
      const overdue = agingOverdue(aging);
      return (
        <div className="flex w-36 flex-col gap-1">
          <AgingBar aging={aging} />
          {openItemCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {formatNumber(openItemCount)} سندِ باز
              {overdue > 0 && <span className="text-destructive"> · معوق {formatNumber(overdue)}</span>}
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "lastPaymentAt",
    accessorKey: "lastPaymentAt",
    header: "آخرین پرداخت",
    cell: (info) => <DateCell value={info.getValue()} />,
  },
  {
    id: "lastEntryAt",
    accessorKey: "lastEntryAt",
    header: "آخرین گردش",
    cell: (info) => <DateCell value={info.getValue()} />,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">گردش</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <Button asChild variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
        <Link to={ledgerLinkOf(row.original)}>
          <BookOpenText className="size-3.5" />
          گردش
        </Link>
      </Button>
    ),
  },
];

/**
 * حسابِ اشخاص: هر مشتری و تامین‌کننده یک ردیف. مانده از دفترِ اشخاص است (مثبت = بدهکار)،
 * سنی‌بندی از اسنادِ باز — این دو می‌توانند فرق کنند و ستون‌هایشان جداست.
 */
export default function PartyBalanceTable(props) {
  return (
    <DataTable
      {...props}
      columns={columns}
      getRowKey={(row) => `${row.original.partyType}-${row.original.partyId}`}
      emptyMessage="طرف‌حسابی با این فیلترها نیست."
    />
  );
}

