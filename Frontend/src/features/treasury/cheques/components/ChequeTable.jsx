import { Link } from "react-router-dom";
import { Banknote, Forward, MoreVertical, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import DataTable from "@/shared/components/table/DataTable";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { CHEQUE_STATUS_LABELS, CHEQUE_STATUS_TONES, ChequeStatusEnum } from "@/shared/domain/enums/chequeStatus";
import { PAYMENT_PURPOSE_LABELS } from "@/shared/domain/enums/paymentDirection";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { CHEQUE_DIRECTION_LABELS, canBounceCheque, canCashCheque, canEndorseCheque, dueText } from "../domain/cheque";

/** پیوند به سندِ مبدأ: فاکتور، وگرنه صفحه‌ی شخص (علی‌الحساب). */
function sourceOf(cheque) {
  if (cheque.saleId) return { to: routeWithId(ROUTES.SALES_DETAIL, cheque.saleId), label: cheque.invoiceNumber || "فاکتور فروش" };
  if (cheque.purchaseId) return { to: routeWithId(ROUTES.PURCHASES_DETAIL, cheque.purchaseId), label: cheque.invoiceNumber || "فاکتور خرید" };
  if (cheque.partyId) {
    const pattern = cheque.isCustomer ? ROUTES.CUSTOMERS_DETAIL : ROUTES.SUPPLIERS_DETAIL;
    return { to: routeWithId(pattern, cheque.partyId), label: "علی‌الحساب" };
  }
  return null;
}

function Actions({ cheque, onCash, onBounce, onEndorse }) {
  const items = [
    canCashCheque(cheque) && { label: "وصول", icon: <Banknote className="size-4" />, onSelect: () => onCash(cheque) },
    canEndorseCheque(cheque) && { label: "خرج به تامین‌کننده", icon: <Forward className="size-4" />, onSelect: () => onEndorse(cheque) },
    canBounceCheque(cheque) && { label: "برگشت", icon: <Undo2 className="size-4" />, onSelect: () => onBounce(cheque), destructive: true },
  ].filter(Boolean);
  if (items.length === 0) return null;
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`کارهای چکِ ${cheque.checkNumber ?? ""}`}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem key={item.label} onSelect={item.onSelect} variant={item.destructive ? "destructive" : undefined}>
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function columnsFor(actions) {
  return [
    {
      accessorKey: "partyName",
      meta: { mobile: "title" },
      header: "طرف",
      cell: ({ row }) => {
        const source = sourceOf(row.original);
        return (
          <div className="min-w-0">
            <p className="font-medium">{row.original.partyName || "—"}</p>
            <p className="text-xs text-muted-foreground">
              {CHEQUE_DIRECTION_LABELS[row.original.direction]}
              {PAYMENT_PURPOSE_LABELS[row.original.purpose] && ` · ${PAYMENT_PURPOSE_LABELS[row.original.purpose]}`}
              {source && (
                <>
                  {" · "}
                  <Link to={source.to} className="text-primary hover:underline">
                    {source.label}
                  </Link>
                </>
              )}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "checkDueDate",
      meta: { mobile: "subtitle" },
      header: "سررسید",
      cell: ({ row }) => {
        const pending = Number(row.original.status) === ChequeStatusEnum.PENDING;
        const late = pending && row.original.daysToDue < 0;
        return (
          <span className="tabular-nums text-sm">
            {row.original.checkDueDate ? gregorianToPersian(row.original.checkDueDate) : "—"}
            {pending && dueText(row.original.daysToDue) && (
              <span className={cn("block text-[11px]", late ? toneText("danger") : "text-muted-foreground")}>
                {dueText(row.original.daysToDue)}
              </span>
            )}
          </span>
        );
      },
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
      enableSorting: false,
      cell: ({ row }) => (
        <StatusBadge tone={CHEQUE_STATUS_TONES[row.original.status]} title={row.original.statusNote || undefined}>
          {CHEQUE_STATUS_LABELS[row.original.status] ?? row.original.statusTitle}
        </StatusBadge>
      ),
    },
    {
      accessorKey: "checkNumber",
      header: "چک",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs">
          <span dir="ltr" className="font-mono">{row.original.checkNumber || "—"}</span>
          <span className="block text-muted-foreground">
            {[row.original.checkBankName, row.original.checkDrawerName].filter(Boolean).join(" · ")}
          </span>
        </span>
      ),
    },
    {
      accessorKey: "bankAccountTitle",
      header: "صندوق/حساب",
      enableSorting: false,
      cell: ({ row }) => <span className="text-xs">{row.original.bankAccountTitle || "—"}</span>,
    },
    ...(actions
      ? [
          {
            id: "actions",
            header: () => <span className="sr-only">کارها</span>,
            enableSorting: false,
            cell: ({ row }) => <Actions cheque={row.original} {...actions} />,
          },
        ]
      : []),
  ];
}

/**
 * فهرستِ چک‌ها (`ServerTable`). سررسیدِ گذشته‌ی چکِ در جریان قرمز است.
 *
 * @param actions `{ onCash, onBounce, onEndorse }` — بی آن ستونِ کارها نیست (دسترسیِ `CheckManage`)
 */
export default function ChequeTable({ actions, ...tableProps }) {
  return (
    <DataTable
      {...tableProps}
      columns={columnsFor(actions)}
      getRowKey={(row) => row.original.id}
      emptyMessage="چکی با این فیلترها یافت نشد."
    />
  );
}
