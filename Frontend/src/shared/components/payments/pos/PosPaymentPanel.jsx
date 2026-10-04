import { CreditCard } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import PosReadyForm from "./PosReadyForm";
import { Outcome, RecordFailed, Recorded, Unknown } from "./PosResultViews";
import { PosStatus, canStartPos } from "@/shared/domain/pos/posSession";
import { formatRial } from "@/shared/lib/numberFormat";
import { toneRow } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

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
        <PosReadyForm
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

