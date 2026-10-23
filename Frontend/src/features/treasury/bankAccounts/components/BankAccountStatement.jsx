import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, ArrowRight, Ban, Landmark, Pencil, Undo2, Wallet } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import StatusBadge from "@/shared/components/status/StatusBadge";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import {
  BANK_ACCOUNT_KIND_LABELS,
  BANK_ACCOUNT_MOVEMENT_LABELS,
  BankAccountKindEnum,
  BankAccountMovementKindEnum,
} from "@/shared/domain/enums/bankAccount";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import LazyBankLogo from "@/shared/components/payments/LazyBankLogo";
import { formatCardNumber, formatShaba, getIranianBank, getIranianBankByCardNumber, getIranianBankByShaba } from "@/shared/lib/iranian-bank";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { useBankAccountStatementQuery } from "../services/queries";
import { useVoidTransferMutation } from "../services/mutations";
import { defaultStatementRange, isTransferMovement } from "../domain/bankAccountStatement";

/** مانده با رنگ: منفی یعنی ثبتی جا افتاده (سرور جلویش را نمی‌گیرد). */
function Balance({ value, className }) {
  const number = Number(value) || 0;
  return (
    <span className={cn("tabular-nums", number < 0 && toneText("danger"), className)}>
      {number < 0 && "−"}
      {formatNumber(Math.abs(number))}
    </span>
  );
}

/** پیوند به سندِ مبدأ: فاکتورِ فروش/خرید، وگرنه طرفِ حساب (علی‌الحساب). */
function sourceLinkOf(row) {
  if (row.saleId) return { to: routeWithId(ROUTES.SALES_DETAIL, row.saleId), label: row.invoiceNumber || "فاکتور فروش" };
  if (row.purchaseId) return { to: routeWithId(ROUTES.PURCHASES_DETAIL, row.purchaseId), label: row.invoiceNumber || "فاکتور خرید" };
  if (row.customerId) return { to: routeWithId(ROUTES.CUSTOMERS_DETAIL, row.customerId), label: "علی‌الحساب" };
  if (row.supplierId) return { to: routeWithId(ROUTES.SUPPLIERS_DETAIL, row.supplierId), label: "علی‌الحساب" };
  return null;
}

function MovementText({ row }) {
  if (isTransferMovement(row)) {
    const toward = row.kind === BankAccountMovementKindEnum.TRANSFER_IN ? "از" : "به";
    return (
      <>
        <p>
          {BANK_ACCOUNT_MOVEMENT_LABELS[row.kind]} — {toward} {row.counterpartBankAccountTitle}
        </p>
        <p className="text-muted-foreground">
          {[row.reference && `پیگیری ${row.reference}`, row.description].filter(Boolean).join(" · ")}
        </p>
      </>
    );
  }
  const source = sourceLinkOf(row);
  return (
    <>
      <p>
        {row.partyName || BANK_ACCOUNT_MOVEMENT_LABELS[row.kind]}
        {source && (
          <>
            {" · "}
            <Link to={source.to} className="text-primary hover:underline">
              {source.label}
            </Link>
          </>
        )}
      </p>
      <p className="text-muted-foreground">
        {[row.paymentType != null && PAYMENT_TYPE_LABELS[row.paymentType], row.reference, row.description]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </>
  );
}

/** شبا و کارتِ حساب، هر کدام با لوگوی بانکِ خودش (شبا و کارت ممکن است مالِ دو بانک باشند). */
function AccountNumbers({ account }) {
  const numbers = [
    account.iban && { key: "iban", label: "شبا", value: `IR ${formatShaba(account.iban)}`, bank: getIranianBankByShaba(account.iban) },
    account.cardNumber && {
      key: "card",
      label: "کارت",
      value: formatCardNumber(account.cardNumber),
      bank: getIranianBankByCardNumber(account.cardNumber),
    },
    account.accountNumber && { key: "account", label: "حساب", value: account.accountNumber },
  ].filter(Boolean);
  if (!numbers.length) return null;

  return (
    <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {numbers.map((number) => (
        <div key={number.key} className="flex items-center gap-1">
          <dt>{number.label}:</dt>
          <dd className="flex items-center gap-1 font-mono text-foreground" dir="ltr">
            <LazyBankLogo bank={number.bank} className="size-4" />
            {number.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AccountHeader({ account, balance, canManage, onEdit, onDeactivate, onTransfer }) {
  const isBank = account.kind === BankAccountKindEnum.BANK;
  const Icon = isBank ? Landmark : Wallet;
  const bank = isBank ? getIranianBank(account) : null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 sm:px-4">
      <Button asChild variant="ghost" size="icon" className="lg:hidden">
        <Link to={ROUTES.TREASURY_ACCOUNTS} aria-label="بازگشت به فهرست حساب‌ها">
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <LazyBankLogo bank={bank} className="size-6" fallback={<Icon className="size-5" />} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="flex flex-wrap items-center gap-2 font-bold">
          <span className="truncate">{account.title}</span>
          {!account.isActive && <StatusBadge tone="neutral" size="sm">غیرفعال</StatusBadge>}
        </h2>
        <p className="truncate text-xs text-muted-foreground" dir="auto">
          {[BANK_ACCOUNT_KIND_LABELS[account.kind], isBank && account.bankName].filter(Boolean).join(" · ")}
        </p>
        {isBank && <AccountNumbers account={account} />}
      </div>
      <div className="text-end">
        <p className="text-[11px] text-muted-foreground">مانده</p>
        <Balance value={balance} className="text-lg font-bold" />
      </div>
      {canManage && account.isActive && (
        <div className="flex w-full flex-wrap gap-2 border-t border-border pt-3 sm:w-auto sm:border-0 sm:pt-0">
          <Button size="sm" className="gap-1.5" onClick={onTransfer}>
            <ArrowLeftRight className="size-3.5" />
            انتقال
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
            <Pencil className="size-3.5" />
            ویرایش
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={onDeactivate}>
            <Ban className="size-3.5" />
            غیرفعال
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * یک صندوق/حساب: سرصفحه با مانده و کارها، و گردشِ حساب (`GetBankAccountStatement`) در بازه‌ی تاریخ — مانده‌ی
 * ابتدای دوره، ردیف‌ها با مانده‌ی جاری، جمع‌ها. انتقال‌ها از همین‌جا ابطال می‌شوند.
 *
 * @param account  ردیفِ حساب از `GetBankAccountList` (مانده‌ی کل)؛ گردش جدا خوانده می‌شود
 */
export default function BankAccountStatement({ account, canManage, onEdit, onDeactivate, onTransfer }) {
  const [range, setRange] = useState(defaultStatementRange);
  const [voidTarget, setVoidTarget] = useState(null);
  const voidMutation = useVoidTransferMutation();
  const query = useBankAccountStatementQuery({ bankAccountId: account.id, ...range });
  const data = query.data;
  const rows = data?.rows ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <AccountHeader
        account={account}
        balance={account.balance}
        canManage={canManage}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onTransfer={onTransfer}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="bank-statement-from" className="text-xs">
              از تاریخ
            </Label>
            <PersianDatePicker
              id="bank-statement-from"
              value={range.fromDate}
              onChange={(isoDate) => setRange((prev) => ({ ...prev, fromDate: isoDate || "" }))}
              placeholder="از ابتدا"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank-statement-to" className="text-xs">
              تا تاریخ
            </Label>
            <PersianDatePicker
              id="bank-statement-to"
              value={range.toDate}
              onChange={(isoDate) => setRange((prev) => ({ ...prev, toDate: isoDate || "" }))}
              placeholder="تا امروز"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!range.fromDate && !range.toDate}
            onClick={() => setRange({ fromDate: "", toDate: "" })}
          >
            از ابتدا
          </Button>
        </div>

        {query.isError ? (
          <QueryErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className={cn("min-h-0 flex-1 space-y-2 overflow-y-auto", query.isFetching && "opacity-60")}>
            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">مانده‌ی ابتدای دوره</span>
              <Balance value={data?.openingBalance} />
            </div>

            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">در این بازه گردشی ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[600px] text-xs">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-right font-medium">تاریخ</th>
                      <th className="px-2 py-2 text-right font-medium">شرح</th>
                      <th className="px-2 py-2 text-center font-medium">واریز</th>
                      <th className="px-2 py-2 text-center font-medium">برداشت</th>
                      <th className="px-2 py-2 text-center font-medium">مانده</th>
                      {canManage && (
                        <th className="w-0 px-2 py-2">
                          <span className="sr-only">ابطال</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, index) => (
                      <tr key={`${row.kind}-${row.paymentDetailId ?? row.transferId}-${index}`}>
                        <td className="whitespace-nowrap px-2 py-2 tabular-nums">{gregorianToPersian(row.occurredAt)}</td>
                        <td className="px-2 py-2">
                          <MovementText row={row} />
                        </td>
                        <td className={cn("px-2 py-2 text-center tabular-nums", Number(row.in) > 0 && toneText("success"))}>
                          {Number(row.in) ? formatNumber(row.in) : "—"}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">
                          {Number(row.out) ? formatNumber(row.out) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-center">
                          <Balance value={row.balance} />
                        </td>
                        {canManage && (
                          <td className="px-2 py-2">
                            {isTransferMovement(row) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs"
                                onClick={() => setVoidTarget(row)}
                              >
                                <Undo2 className="size-3.5" />
                                ابطال
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">جمعِ واریز</span>
                <span className="tabular-nums">{formatNumber(data?.totalIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">جمعِ برداشت</span>
                <span className="tabular-nums">{formatNumber(data?.totalOut)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold">
                <span className="text-muted-foreground">مانده‌ی پایانِ دوره</span>
                <Balance value={data?.closingBalance} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              چک فقط پس از وصول و در تاریخِ وصول در مانده می‌آید. پولِ مرجوعی‌ها هنوز در گردشِ صندوق و بانک نیست.
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(voidTarget)}
        onOpenChange={(open) => !open && setVoidTarget(null)}
        title="ابطالِ انتقال"
        description={
          voidTarget &&
          `انتقالِ ${formatNumber(Number(voidTarget.in) || Number(voidTarget.out))} ریالی ${
            voidTarget.kind === BankAccountMovementKindEnum.TRANSFER_IN ? "از" : "به"
          } «${voidTarget.counterpartBankAccountTitle}» از گردشِ هر دو حساب برداشته می‌شود. انتقال ویرایش ندارد؛ اگر لازم است، دوباره ثبتش کنید.`
        }
        confirmLabel="ابطالِ انتقال"
        pendingLabel="در حال ابطال..."
        isPending={voidMutation.isPending}
        onConfirm={() => voidMutation.mutate(voidTarget.transferId, { onSuccess: () => setVoidTarget(null) })}
      />
    </div>
  );
}
