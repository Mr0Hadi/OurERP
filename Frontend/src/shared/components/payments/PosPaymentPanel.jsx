import { useState } from "react";
import { CircleAlert, CircleCheck, CircleX, CreditCard, RotateCcw, ScanLine, TriangleAlert } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { BankLogo } from "@/shared/components/ui/bank-input";
import { Spinner } from "@/shared/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import AmountInWords from "@/shared/components/forms/AmountInWords";
import { PosStatus, canStartPos } from "@/shared/domain/pos/posSession";
import { usePosTerminalsQuery } from "@/shared/services/pos/queries";
import { getIranianBankByCardNumber } from "@/shared/lib/iranian-bank";
import { formatRial } from "@/shared/lib/numberFormat";
import { toneRow, toneSoft, toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

const TERMINAL_KEY = "pos.terminalId";

/**
 * «دریافت با کارتخوان» — زیرِ ردیفِ «انتقال بانکی»ِ فرمِ پرداخت.
 *
 * وضعیت از `usePosPayment` می‌آید و کارها با callbackها برمی‌گردند؛ پنل فقط
 * انتخابِ دستگاه را خودش نگه می‌دارد. بخش‌ها: آماده (دستگاه + ارسال)، در جریان
 * (منتظرِ کارت / ثبت)، نتیجه (موفق / رد / لغو / خطا) و دو حالتی که پول ممکن است
 * رفته باشد (نامشخص / ثبت‌نشده).
 *
 * @param pos           خروجیِ `usePosPayment`
 * @param amount        مبلغی که روی دستگاه می‌آید (ریال)
 * @param blockedReason اگر پر باشد ارسال بسته است و این متن دلیلش را می‌گوید
 * @param hint          توضیحِ کوتاه زیرِ دکمه‌ی ارسال
 * @param preparing     `onStart` هنوز سند را آماده می‌کند (دکمه بسته)
 * @param onStart       `(terminal) => void`
 * @param onDone        «بستن»ِ رسیدِ موفق
 * @param onManual      ثبتِ ناموفق: نتیجه به فرمِ دریافت برود تا دستی ثبت شود
 */
export default function PosPaymentPanel({
  pos,
  amount,
  blockedReason,
  hint,
  doneLabel,
  preparing,
  onStart,
  onDone,
  onManual,
}) {
  const { state } = pos;
  const { status } = state;

  return (
    <section
      aria-live="polite"
      className={cn("space-y-3 rounded-lg border border-border bg-card p-3", boxTone(status))}
    >
      <header className="flex items-center gap-2 text-sm font-medium">
        <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
        دریافت با کارتخوان
      </header>

      {canStartPos(status) && status !== PosStatus.IDLE && <Outcome state={state} />}

      {canStartPos(status) && (
        <ReadyForm
          retry={status !== PosStatus.IDLE}
          amount={amount}
          blockedReason={blockedReason}
          hint={hint}
          preparing={preparing}
          onStart={onStart}
        />
      )}

      {(status === PosStatus.STARTING || status === PosStatus.WAITING_CARD) && (
        <Waiting state={state} onCancel={pos.cancel} />
      )}

      {(status === PosStatus.APPROVED || status === PosStatus.RECORDING) && (
        <Busy>در حال ثبتِ پرداخت روی سند… صفحه را نبندید.</Busy>
      )}

      {status === PosStatus.RECORDED && <Recorded state={state} doneLabel={doneLabel} onDone={onDone} />}

      {status === PosStatus.RECORD_FAILED && <RecordFailed state={state} onRetry={pos.retryRecord} onManual={onManual} />}

      {status === PosStatus.UNKNOWN && (
        <Unknown
          state={state}
          onCheck={pos.checkLast}
          onReceipt={pos.confirmByReceipt}
          onNotCharged={pos.reset}
        />
      )}
    </section>
  );
}

const BOX_TONES = {
  [PosStatus.RECORDED]: "success",
  [PosStatus.DECLINED]: "danger",
  [PosStatus.FAILED]: "danger",
  [PosStatus.UNKNOWN]: "warning",
  [PosStatus.RECORD_FAILED]: "danger",
};
const boxTone = (status) => toneRow(BOX_TONES[status] ?? "neutral");

const OUTCOME_TITLES = {
  [PosStatus.DECLINED]: "تراکنش انجام نشد",
  [PosStatus.CANCELLED]: "تراکنش لغو شد",
  [PosStatus.FAILED]: "ارتباط با کارتخوان برقرار نشد",
};

/** نتیجه‌ی تلاشِ قبلی (رد، لغو، خطا) بالای فرمِ تلاشِ دوباره؛ در هر سه، از کارت چیزی کم نشده. */
function Outcome({ state }) {
  const cancelled = state.status === PosStatus.CANCELLED;
  return (
    <Notice tone={cancelled ? "neutral" : "danger"} icon={cancelled ? CircleAlert : CircleX}>
      <p className="font-medium">{OUTCOME_TITLES[state.status]}</p>
      <p className="text-xs leading-5">{state.message} از کارت مشتری مبلغی کم نشده است.</p>
    </Notice>
  );
}

/**
 * دستگاهِ این کاربر روی این مرورگر: دستگاه‌ها مشترک‌اند و هر کاربر خودش انتخاب می‌کند؛
 * آخرین انتخاب یادآوری می‌شود و اگر فقط یک دستگاه فعال هست همان انتخاب است.
 */
function useTerminalChoice(terminals) {
  const [chosen, setChosen] = useState(() => {
    try {
      return localStorage.getItem(TERMINAL_KEY);
    } catch {
      return null;
    }
  });
  const terminal =
    terminals.find((candidate) => String(candidate.id) === chosen) ??
    (terminals.length === 1 ? terminals[0] : undefined);

  const choose = (id) => {
    setChosen(id);
    try {
      localStorage.setItem(TERMINAL_KEY, id);
    } catch {
      // حالتِ خصوصی/مسدود: فقط برای همین بار.
    }
  };
  return [terminal, choose];
}

function ReadyForm({ retry, amount, blockedReason, hint, preparing, onStart }) {
  const { data: items = [], isLoading } = usePosTerminalsQuery();
  const [terminal, choose] = useTerminalChoice(items);
  const noTerminal = !isLoading && items.length === 0;
  const disabled = !terminal || !(amount > 0) || Boolean(blockedReason) || preparing;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">دستگاه کارتخوان</Label>
        <Select value={terminal ? String(terminal.id) : ""} onValueChange={choose} disabled={isLoading || noTerminal}>
          <SelectTrigger className="h-9! w-full" aria-label="دستگاه کارتخوان">
            <SelectValue
              placeholder={isLoading ? "در حال بارگذاری…" : noTerminal ? "دستگاهی تعریف نشده" : "دستگاه را انتخاب کنید"}
            />
          </SelectTrigger>
          <SelectContent>
            {items.map((terminal) => (
              <SelectItem key={terminal.id} value={String(terminal.id)}>
                {terminal.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
        <p className="text-[11px] text-muted-foreground">مبلغی که روی دستگاه می‌آید</p>
        <p className="text-lg font-semibold tabular-nums">{formatRial(amount)}</p>
        <AmountInWords rial={amount} />
      </div>

      {blockedReason && <p className="text-xs leading-5 text-destructive">{blockedReason}</p>}
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}

      <Button type="button" className="w-full gap-1.5" disabled={disabled} onClick={() => onStart(terminal)}>
        {preparing ? <Spinner /> : retry ? <RotateCcw className="size-4" /> : <ScanLine className="size-4" />}
        {retry ? "تلاشِ دوباره" : "ارسال به کارتخوان"}
      </Button>
    </div>
  );
}

function Waiting({ state, onCancel }) {
  const connecting = state.status === PosStatus.STARTING;
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/40 px-3 py-4 text-center">
        <Spinner className="size-6 text-primary" />
        <p className="text-lg font-semibold tabular-nums">{formatRial(state.amount)}</p>
        <p className="text-xs leading-5 text-muted-foreground">
          {connecting
            ? "در حال ارسالِ مبلغ به کارتخوان…"
            : "مبلغ روی دستگاه آمد. از مشتری بخواهید کارت را بکشد و رمز را وارد کند."}
        </p>
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
        لغوِ تراکنش
      </Button>
    </div>
  );
}

function Busy({ children }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/40 px-3 py-4 text-xs text-muted-foreground">
      <Spinner />
      {children}
    </div>
  );
}

function Recorded({ state, doneLabel = "بستن", onDone }) {
  return (
    <div className="space-y-3">
      <Notice tone="success" icon={CircleCheck}>
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

function RecordFailed({ state, onRetry, onManual }) {
  const [confirmManual, setConfirmManual] = useState(false);
  return (
    <div className="space-y-3">
      <Notice tone="danger" icon={TriangleAlert}>
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
function Unknown({ state, onCheck, onReceipt, onNotCharged }) {
  const [mode, setMode] = useState(null); // null | "receipt" | "notCharged"
  const [rrn, setRrn] = useState("");
  const [checking, setChecking] = useState(false);

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
      <Notice tone="warning" icon={TriangleAlert}>
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
          <Label className="text-xs">شماره‌ی پیگیری (RRN) روی رسیدِ دستگاه</Label>
          <Input dir="ltr" inputMode="numeric" value={rrn} onChange={(e) => setRrn(e.target.value)} className="h-9" />
          <div className="flex gap-2">
            <Button type="button" size="sm" className="flex-1" disabled={!rrn.trim()} onClick={() => onReceipt({ rrn })}>
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

function Notice({ tone, icon: Icon, children }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm", toneSoft(tone))}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", toneText(tone))} aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">{children}</div>
    </div>
  );
}
