import { Check, ChevronDown, Clock, History, TriangleAlert } from "lucide-react";
import { useState } from "react";

import Notice from "@/shared/components/feedback/Notice";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  SALE_PROFORMA_EVENT_TONES,
  SALE_PROFORMA_STAGE_LABELS,
  SALE_PROFORMA_STAGE_TONES,
  SaleProformaEventEnum,
  SaleProformaStageEnum,
} from "@/shared/domain/enums/saleProforma";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { formatCountdown } from "../../hooks/useReservationCountdown";
import { isInPersonProforma } from "../../domain/proformaFlow";

const STEPS = ["پیش‌فاکتور", "تأیید مشتری", "تأیید انبار", "دریافت و صدور"];

/**
 * مرحله‌ی پیش‌فاکتور در چرخه‌ی تأیید — فقط وضعیت و راهنما؛ کارِ هر مرحله با دکمه‌ی اصلیِ
 * صفحه است (یک دکمه، نه چند دکمه‌ی تأیید):
 *  - پیش‌نویس: پیش‌فاکتور به مشتری داده می‌شود؛ با تأییدش به انبار می‌رود
 *  - در انتظار انبار: انبار بررسی می‌کند (و اگر لازم شد با دلیل تغییر می‌دهد)
 *  - آماده‌ی پرداخت: شمارشِ معکوسِ رزرو؛ مشتری پرداخت می‌کند یا پیش‌فاکتور حذف می‌شود
 *
 * @param secondsLeft      از `useReservationCountdown`
 * @param documentChanged  خودِ پیش‌فاکتور ذخیره‌نشده تغییر کرده
 */
export default function ProformaStageCard({ sale, secondsLeft, documentChanged }) {
  const stage = Number(sale.proformaStage ?? SaleProformaStageEnum.DRAFT);
  const events = sale.proformaEvents || [];
  const last = events.at(-1);
  const shortage = stage === SaleProformaStageEnum.DRAFT && last?.kind === SaleProformaEventEnum.WAREHOUSE_SHORTAGE;
  const inPerson = isInPersonProforma(sale);
  // تغییرِ انبار: آخرین تأییدِ انبار با یادداشت (دلیلِ تغییرِ اقلام) — جز یادداشتِ ثابتِ فروشِ حضوری.
  const warehouseNote =
    !inPerson && stage === SaleProformaStageEnum.WAREHOUSE_CHECKED && last?.kind === SaleProformaEventEnum.WAREHOUSE_CHECKED
      ? last.note
      : null;
  const expired = stage === SaleProformaStageEnum.WAREHOUSE_CHECKED && secondsLeft === 0;
  const openIssues = (sale.warehouseIssues || []).filter((issue) => issue.resolution == null).length;

  const guide =
    stage === SaleProformaStageEnum.DRAFT
      ? "پیش‌فاکتور را به مشتری بدهید. اگر تأیید کرد، با دکمه‌ی اصلی به انبار بفرستید."
      : stage === SaleProformaStageEnum.CUSTOMER_APPROVED
        ? "در صفِ انبار: انباردار کالا را برمی‌دارد و اسکن می‌کند؛ اگر چیزی کم باشد با دلیل اصلاح و تأیید می‌کند."
        : expired
          ? "مهلتِ رزرو تمام شد و پرداخت پذیرفته نمی‌شود. کالا به‌زودی آزاد و پیش‌فاکتور برای بررسیِ دوباره به انبار برمی‌گردد."
          : inPerson
            ? "فروشِ حضوری: دانه‌های اسکن‌شده برای مشتری رزرو است. پرداخت همین‌جا یا در صندوق؛ با دریافتِ کلِ مبلغ کالا همان‌جا تحویل می‌شود. اگر مشتری نخواست، رزرو را آزاد یا پیش‌فاکتور را حذف کنید."
            : "کالا برای مشتری رزرو شده است. پیش‌فاکتور را به مشتری بدهید: اگر خواست، دریافت را ثبت کنید تا فاکتور صادر شود؛ اگر نخواست، پیش‌فاکتور را حذف کنید.";

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">مسیر پیش‌فاکتور</CardTitle>
        <div className="flex items-center gap-2">
          {stage === SaleProformaStageEnum.WAREHOUSE_CHECKED && secondsLeft != null && (
            <StatusBadge tone={expired ? "danger" : secondsLeft < 120 ? "caution" : "info"} icon={Clock}>
              <span className="tabular-nums" dir="ltr">
                {expired ? "مهلت تمام شد" : formatCountdown(secondsLeft)}
              </span>
            </StatusBadge>
          )}
          <StatusBadge tone={SALE_PROFORMA_STAGE_TONES[stage]}>{SALE_PROFORMA_STAGE_LABELS[stage]}</StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="grid grid-cols-4 gap-1" aria-label="مرحله‌ها">
          {STEPS.map((step, index) => {
            // پیش‌نویس یعنی پیش‌فاکتور ساخته شده و گامِ در جریان «تأیید مشتری» است، و همین‌طور تا آخر.
            const done = index <= stage;
            const current = index === stage + 1;
            return (
              <li key={step} className="space-y-1.5" aria-current={current ? "step" : undefined}>
                <div className={cn("h-1.5 rounded-full", done ? "bg-primary" : current ? "bg-primary/40" : "bg-muted")} />
                <p
                  className={cn(
                    "flex items-center gap-1 text-[11px] leading-4 md:text-xs",
                    current ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {done && <Check className="size-3 shrink-0 text-primary" />}
                  {step}
                </p>
              </li>
            );
          })}
        </ol>

        <p className="text-sm leading-6 text-muted-foreground">{guide}</p>

        {shortage && (
          <Notice tone="danger" icon={TriangleAlert}>
            <span className="font-semibold">انبار کسری گزارش کرد{last.userName ? ` (${last.userName})` : ""}: </span>
            {last.note || "همه‌ی کالاها موجود نبود."}
          </Notice>
        )}

        {warehouseNote && (
          <Notice tone="info">
            <span className="font-semibold">انبار پیش‌فاکتور را تغییر داد{last.userName ? ` (${last.userName})` : ""}: </span>
            {warehouseNote}
          </Notice>
        )}

        {documentChanged && stage !== SaleProformaStageEnum.DRAFT && (
          <Notice tone="caution">
            ذخیره‌ی تغییرِ کالا، تعداد، قیمت، مشتری یا شیوه‌ی پرداخت، پیش‌فاکتور را به پیش‌نویس برمی‌گرداند و باید دوباره
            به تأیید مشتری و انبار برسد.
          </Notice>
        )}

        {openIssues > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatNumber(openIssues)} دانه‌ی معیوب/مفقود در بررسیِ انبار گزارش شده و منتظرِ تصمیمِ حسابداری است.
          </p>
        )}

        {events.length > 0 && <EventHistory events={events} />}
      </CardContent>
    </Card>
  );
}

function EventHistory({ events }) {
  const [open, setOpen] = useState(false);
  const list = [...events].reverse();
  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <History className="size-3.5" />
        تاریخچه‌ی تأییدها ({formatNumber(events.length)})
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-2 space-y-2 border-s ps-3">
          {list.map((event) => (
            <li key={event.id} className="space-y-0.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge size="sm" tone={SALE_PROFORMA_EVENT_TONES[event.kind] ?? "neutral"}>
                  {event.kindTitle}
                </StatusBadge>
                <span className="text-muted-foreground">
                  {event.userName ?? "سامانه"} · {gregorianToPersianDateTime(event.occurredAt)} · نسخه‌ی{" "}
                  {formatNumber(event.revision)}
                </span>
              </div>
              {event.note && <p className="leading-5 text-muted-foreground">{event.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
