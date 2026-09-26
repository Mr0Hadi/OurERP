import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpenText } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { Label } from "@/shared/components/ui/label";
import { usePartyStatementQuery } from "../services/queries";
import LedgerBalanceBadge from "./LedgerBalanceBadge";
import { ROUTES } from "@/shared/constants/routes";
import { gregorianToPersian } from "@/shared/lib/dateUtils";

/** `PartyLedgerEntryTypeEnum.REVERSAL` — ردیفی که ردیفِ دیگری را پس می‌گیرد. */
const REVERSAL_ENTRY_TYPE = 7;

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/** مانده با علامتِ خوانا: مثبت بدهکار، منفی بستانکار. */
function BalanceText({ value }) {
  const number = Number(value) || 0;
  if (number === 0) return <span className="text-muted-foreground">۰</span>;
  return (
    <span
      className={
        number > 0
          ? "text-amber-700 dark:text-amber-300"
          : "text-sky-700 dark:text-sky-300"
      }
    >
      {fa(Math.abs(number))} {number > 0 ? "بد" : "بس"}
    </span>
  );
}

function sourceLinkOf(entry) {
  if (entry.saleId) {
    return {
      to: ROUTES.SALES_DETAIL.replace(":id", entry.saleId),
      label: "فاکتور فروش",
    };
  }
  if (entry.purchaseId) {
    return {
      to: ROUTES.PURCHASES_DETAIL.replace(":id", entry.purchaseId),
      label: "فاکتور خرید",
    };
  }
  return null;
}

/**
 * گردش حسابِ یک مشتری یا تامین‌کننده (`GetPartyStatement`) — دسترسیِ
 * `PartyStatementView`.
 *
 * بالای جدول مانده‌ی ابتدای دوره، پایینش جمع‌ها و مانده‌ی پایان دوره.
 * ردیف‌های برگشت (`REVERSAL`) کم‌رنگ‌اند و شماره‌ی ردیفِ اصلی‌شان را نشان
 * می‌دهند. هر ردیف به سندِ مبدأش پیوند دارد.
 *
 * حساب از روز فعال‌شدنِ این نسخه شروع شده؛ فاکتورها و پرداخت‌های قبلی
 * روی آن نیستند.
 */
/**
 * @param totalBalance   مانده‌ی کل (اولیه‌ی دستی + دفتر) برای نشانِ بالای کارت.
 * @param openingBalance مانده‌ی اولیه‌ی دستی — پیش از شروعِ دفتر؛ جدولِ سرور آن را ندارد.
 */
export default function PartyStatementCard({
  customerId,
  supplierId,
  totalBalance,
  openingBalance = 0,
}) {
  const [range, setRange] = useState({ fromDate: "", toDate: "" });
  const { data, isLoading, isError, isFetching } = usePartyStatementQuery({
    customerId,
    supplierId,
    ...range,
  });

  const entries = data?.entries || [];

  return (
    <Card className="shadow-md rounded-2xl overflow-hidden pt-0 gap-0">
      <CardHeader className="border-b bg-muted/30 py-4 px-6">
        <CardTitle className="flex items-center justify-between gap-2.5 text-lg font-bold">
          <span className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpenText className="h-4.5 w-4.5 text-primary" />
            </span>
            گردش حساب
          </span>
          <LedgerBalanceBadge balance={totalBalance ?? data?.closingBalance} />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="statement-from" className="text-xs">
              از تاریخ
            </Label>
            <PersianDatePicker
              id="statement-from"
              value={range.fromDate}
              onChange={(isoDate) =>
                setRange((prev) => ({ ...prev, fromDate: isoDate || "" }))
              }
              placeholder="از ابتدا"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="statement-to" className="text-xs">
              تا تاریخ
            </Label>
            <PersianDatePicker
              id="statement-to"
              value={range.toDate}
              onChange={(isoDate) =>
                setRange((prev) => ({ ...prev, toDate: isoDate || "" }))
              }
              placeholder="تا امروز"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            در حال بارگذاری...
          </p>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-4">
            گردش حساب بارگذاری نشد.
          </p>
        ) : (
          <div
            className={`space-y-2 transition-opacity ${isFetching ? "opacity-60" : ""}`}
          >
            {openingBalance !== 0 && (
              <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  مانده‌ی اولیه (دستی، پیش از دفتر)
                </span>
                <BalanceText value={openingBalance} />
              </div>
            )}
            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                مانده‌ی دفتر در ابتدای دوره
              </span>
              <BalanceText value={data?.openingBalance} />
            </div>

            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                در این بازه گردشی ثبت نشده است.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[560px] text-xs">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="text-right px-2 py-2 font-medium">
                        تاریخ
                      </th>
                      <th className="text-right px-2 py-2 font-medium">شرح</th>
                      <th className="text-center px-2 py-2 font-medium">
                        بدهکار
                      </th>
                      <th className="text-center px-2 py-2 font-medium">
                        بستانکار
                      </th>
                      <th className="text-center px-2 py-2 font-medium">
                        مانده
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entries.map((entry) => {
                      const isReversal =
                        entry.entryType === REVERSAL_ENTRY_TYPE;
                      const source = sourceLinkOf(entry);
                      return (
                        <tr
                          key={entry.id}
                          className={isReversal ? "opacity-60" : ""}
                        >
                          <td className="px-2 py-2 whitespace-nowrap">
                            {gregorianToPersian(entry.occurredAt)}
                          </td>
                          <td className="px-2 py-2">
                            <p className="text-card-foreground">
                              {entry.description || entry.entryTypeTitle}
                            </p>
                            <p className="text-muted-foreground">
                              {entry.entryTypeTitle}
                              {isReversal && entry.reversalOfEntryId && (
                                <>
                                  {" "}
                                  · برگشتِ ردیف #{fa(entry.reversalOfEntryId)}
                                </>
                              )}
                              {source && (
                                <>
                                  {" · "}
                                  <Link
                                    to={source.to}
                                    className="text-primary hover:underline"
                                  >
                                    {source.label}
                                  </Link>
                                </>
                              )}
                            </p>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {Number(entry.debit) ? fa(entry.debit) : "—"}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {Number(entry.credit) ? fa(entry.credit) : "—"}
                          </td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">
                            <BalanceText value={entry.runningBalance} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">جمع بدهکار</span>
                <span>{fa(data?.totalDebit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">جمع بستانکار</span>
                <span>{fa(data?.totalCredit)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold">
                <span className="text-muted-foreground">
                  مانده‌ی دفتر در پایان دوره
                </span>
                <BalanceText value={data?.closingBalance} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              پیش‌فاکتور روی حساب نمی‌آید. حساب از روز راه‌اندازیِ دفتر اشخاص
              شروع شده و فاکتورها و پرداخت‌های قبل از آن را ندارد.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
