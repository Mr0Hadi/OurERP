import { useState } from "react";
import { CircleAlert, CircleCheck, CircleX, RotateCcw, ScanLine, TriangleAlert } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { BankLogo } from "@/shared/components/ui/bank-input";
import { Spinner } from "@/shared/components/ui/spinner";
import Notice from "@/shared/components/feedback/Notice";
import { PosStatus, normalizeRrn } from "@/shared/domain/pos/posSession";
import { getIranianBankByCardNumber } from "@/shared/lib/iranian-bank";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * نمای نتیجه‌های پنلِ کارتخوان: تلاشِ ناموفق (رد/لغو/خطا)، ثبت‌شده، ثبت‌نشده با پولِ
 * کشیده‌شده، و نامشخص. هر کدام فقط state را می‌خوانند و کار را با callback برمی‌گردانند.
 */

const OUTCOME_TITLES = {
  [PosStatus.DECLINED]: "تراکنش انجام نشد",
  [PosStatus.CANCELLED]: "تراکنش لغو شد",
  [PosStatus.FAILED]: "ارتباط با کارتخوان برقرار نشد",
};

/** نتیجه‌ی تلاشِ قبلی (رد، لغو، خطا) بالای فرمِ تلاشِ دوباره؛ در هر سه، از کارت چیزی کم نشده. */
export function Outcome({ state }) {
  const cancelled = state.status === PosStatus.CANCELLED;
  return (
    <Notice className="py-2.5 text-sm" tone={cancelled ? "neutral" : "danger"} icon={cancelled ? CircleAlert : CircleX}>
      <p className="font-medium">{OUTCOME_TITLES[state.status]}</p>
      <p className="text-xs leading-5">{state.message} از کارت مشتری مبلغی کم نشده است.</p>
    </Notice>
  );
}

export function Recorded({ state, doneLabel = "بستن", onDone }) {
  return (
    <div className="space-y-3">
      <Notice className="py-2.5 text-sm" tone="success" icon={CircleCheck}>
        <p className="font-medium">پرداخت دریافت و روی سند ثبت شد</p>
        <p className="text-sm font-semibold tabular-nums">{formatRial(state.amount)}</p>
      </Notice>
      <ReceiptDetails result={state.result} />
      <Button type="button" variant="outline" className="w-full" onClick={onDone}>
        {doneLabel}
      </Button>
    </div>
  );
}

export function RecordFailed({ state, onRetry, onManual }) {
  const [confirmManual, setConfirmManual] = useState(false);
  return (
    <div className="space-y-3">
      <Notice className="py-2.5 text-sm" tone="danger" icon={TriangleAlert}>
        <p className="font-medium">پول از مشتری کم شد، ولی روی سند ثبت نشد</p>
        <p className="text-xs leading-5">{state.message} صفحه را نبندید و دوباره ثبت را بزنید.</p>
      </Notice>
      <ReceiptDetails result={state.result} />
      <Button type="button" className="w-full gap-1.5" onClick={onRetry}>
        <RotateCcw className="size-4" />
        ثبتِ دوباره‌ی پرداخت
      </Button>
      {confirmManual ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2.5">
          <p className="text-xs leading-5">
            مبلغ و شماره‌ی پیگیری در فرمِ دریافت می‌نشیند؛ مشکل را برطرف کنید و با «افزودن» و دکمه‌ی اصلیِ صفحه
            ثبتش کنید.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={onManual}>
              ثبتِ دستی
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmManual(false)}>
              انصراف
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" variant="ghost" className="w-full text-muted-foreground" onClick={() => setConfirmManual(true)}>
          ثبت نمی‌شود؟ ثبتِ دستی
        </Button>
      )}
    </div>
  );
}

/** پول ممکن است رفته باشد؛ هیچ تلاشِ دوباره‌ای تا روشن‌شدنِ وضعیت. */
export function Unknown({ state, onCheck, onReceipt, onNotCharged }) {
  const [mode, setMode] = useState(null); // null | "receipt" | "notCharged"
  const [rrn, setRrn] = useState("");
  const [checking, setChecking] = useState(false);
  const validRrn = normalizeRrn(rrn);

  const check = async () => {
    setChecking(true);
    try {
      await onCheck();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-3">
      <Notice className="py-2.5 text-sm" tone="warning" icon={TriangleAlert}>
        <p className="font-medium">نتیجه‌ی تراکنش نامشخص است</p>
        <p className="text-xs leading-5">
          {state.message} ممکن است از کارت مشتری مبلغ کم شده باشد؛ تا روشن‌شدن، دوباره مبلغ نزنید.
        </p>
      </Notice>

      <Button type="button" variant="outline" className="w-full gap-1.5" disabled={checking} onClick={check}>
        {checking ? <Spinner /> : <ScanLine className="size-4" />}
        بررسیِ آخرین تراکنشِ دستگاه
      </Button>

      {mode === "receipt" ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2.5">
          <Label htmlFor="pos-receipt-rrn" className="text-xs">
            شماره‌ی مرجع (RRN) روی رسیدِ دستگاه
          </Label>
          <Input
            id="pos-receipt-rrn"
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            maxLength={24}
            value={rrn}
            onChange={(e) => setRrn(e.target.value)}
            aria-invalid={Boolean(rrn.trim()) && !validRrn}
            className="h-9"
          />
          <p className="text-[11px] leading-5 text-muted-foreground">
            فقط وقتی رسیدِ «تراکنش موفق» در دست دارید. شماره‌ی مرجع ۶ تا ۲۰ رقم است.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" className="flex-1" disabled={!validRrn} onClick={() => onReceipt({ rrn })}>
              ثبت با رسید
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
              انصراف
            </Button>
          </div>
        </div>
      ) : mode === "notCharged" ? (
        <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
          <p className="text-xs leading-5">مطمئنید که روی دستگاه و رسید هیچ تراکنشِ موفقی نیست؟</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="destructive" className="flex-1" onClick={onNotCharged}>
              بله، پولی کم نشده
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
              انصراف
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode("receipt")}>
            ثبت با رسید
          </Button>
          <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setMode("notCharged")}>
            پولی کم نشده
          </Button>
        </div>
      )}
    </div>
  );
}

/** کارتِ ماسک‌شده با لوگوی بانکِ مشتری، شماره‌ی پیگیری و کدِ تأیید. */
function ReceiptDetails({ result }) {
  if (!result) return null;
  const bank = getIranianBankByCardNumber(result.maskedCardNumber);
  const rows = [
    result.maskedCardNumber && {
      label: "کارت",
      value: (
        <span className="inline-flex items-center gap-1.5" dir="ltr">
          <BankLogo bank={bank} />
          {result.maskedCardNumber}
        </span>
      ),
    },
    bank && { label: "بانکِ کارت", value: bank.name },
    result.rrn && { label: "شماره‌ی پیگیری", value: <span dir="ltr">{result.rrn}</span> },
    result.approvalCode && { label: "کدِ تأیید", value: <span dir="ltr">{result.approvalCode}</span> },
    result.manual && { label: "منبع", value: "ثبت دستی از رسید" },
  ].filter(Boolean);
  if (rows.length === 0) return null;

  return (
    <dl className="divide-y divide-border rounded-lg border border-border text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
