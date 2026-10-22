import { Check, TriangleAlert } from "lucide-react";

import Notice from "@/shared/components/feedback/Notice";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  SALE_PROFORMA_STAGE_LABELS,
  SALE_PROFORMA_STAGE_TONES,
  SaleProformaEventEnum,
  SaleProformaStageEnum,
} from "@/shared/domain/enums/saleProforma";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { isInPersonProforma, warehouseChangeNote } from "../../domain/proformaFlow";
import ProformaEventHistory from "./ProformaEventHistory";
import ReservationBadge from "./ReservationBadge";

const STEPS = ["پیش‌فاکتور", "تأیید مشتری", "تأیید انبار", "دریافت و صدور"];

/** یک خط راهنما برای مرحله‌ی فعلی — کارِ همان مرحله با دکمه‌ی اصلیِ صفحه است. */
function stageGuide({ stage, expired, inPerson }) {
  if (stage === SaleProformaStageEnum.DRAFT) {
    return "پیش‌فاکتور را به مشتری بدهید. اگر تأیید کرد، با دکمه‌ی اصلی به انبار بفرستید.";
  }
  if (stage === SaleProformaStageEnum.CUSTOMER_APPROVED) {
    return "در صفِ انبار: انباردار کالا را برمی‌دارد و اسکن می‌کند؛ اگر چیزی کم باشد با دلیل اصلاح و تأیید می‌کند.";
  }
  if (expired) {
    return "مهلتِ رزرو تمام شد و پرداخت پذیرفته نمی‌شود. کالا به‌زودی آزاد و پیش‌فاکتور برای بررسیِ دوباره به انبار برمی‌گردد.";
  }
  if (inPerson) {
    return "فروشِ حضوری: دانه‌های اسکن‌شده برای مشتری رزرو است. پرداخت همین‌جا یا در صندوق؛ با دریافتِ کلِ مبلغ کالا همان‌جا تحویل می‌شود. اگر مشتری نخواست، رزرو را آزاد یا پیش‌فاکتور را حذف کنید.";
  }
  return "کالا برای مشتری رزرو شده است. پیش‌فاکتور را به مشتری بدهید: اگر خواست، دریافت را ثبت کنید تا فاکتور صادر شود؛ اگر نخواست، پیش‌فاکتور را حذف کنید.";
}

/** نوارِ چهار گامِ چرخه؛ پیش‌نویس یعنی گامِ اول انجام شده و «تأیید مشتری» در جریان است. */
function StageSteps({ stage }) {
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="مرحله‌ها">
      {STEPS.map((step, index) => {
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
  );
}

/**
 * مرحله‌ی پیش‌فاکتور در چرخه‌ی تأیید — فقط وضعیت و راهنما؛ کارِ هر مرحله با دکمه‌ی اصلیِ صفحه است (یک دکمه،
 * نه چند دکمه‌ی تأیید). کسریِ گزارش‌شده یا دلیلِ تغییرِ انبار، هشدارِ «ذخیره تأییدها را برمی‌گرداند»، گزارش‌های
 * بازِ انبار و تاریخچه هم این‌جاست.
 *
 * @param secondsLeft     از `useReservationCountdown`
 * @param documentChanged خودِ پیش‌فاکتور ذخیره‌نشده تغییر کرده
 */
export default function ProformaStageCard({ sale, secondsLeft, documentChanged }) {
  const stage = Number(sale.proformaStage ?? SaleProformaStageEnum.DRAFT);
  const events = sale.proformaEvents || [];
  const last = events.at(-1);
  const shortage = stage === SaleProformaStageEnum.DRAFT && last?.kind === SaleProformaEventEnum.WAREHOUSE_SHORTAGE;
  const change = warehouseChangeNote(sale);
  const expired = stage === SaleProformaStageEnum.WAREHOUSE_CHECKED && secondsLeft === 0;
  const openIssues = (sale.warehouseIssues || []).filter((issue) => issue.resolution == null).length;
  const byUser = (userName) => (userName ? ` (${userName})` : "");

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">مسیر پیش‌فاکتور</CardTitle>
        <div className="flex items-center gap-2">
          {stage === SaleProformaStageEnum.WAREHOUSE_CHECKED && <ReservationBadge secondsLeft={secondsLeft} />}
          <StatusBadge tone={SALE_PROFORMA_STAGE_TONES[stage]}>{SALE_PROFORMA_STAGE_LABELS[stage]}</StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <StageSteps stage={stage} />
        <p className="text-sm leading-6 text-muted-foreground">
          {stageGuide({ stage, expired, inPerson: isInPersonProforma(sale) })}
        </p>

        {shortage && (
          <Notice tone="danger" icon={TriangleAlert}>
            <span className="font-semibold">انبار کسری گزارش کرد{byUser(last.userName)}: </span>
            {last.note || "همه‌ی کالاها موجود نبود."}
          </Notice>
        )}
        {change && (
          <Notice tone="info">
            <span className="font-semibold">انبار پیش‌فاکتور را تغییر داد{byUser(change.userName)}: </span>
            {change.note}
          </Notice>
        )}
        {documentChanged && stage !== SaleProformaStageEnum.DRAFT && (
          <Notice tone="caution">
            ذخیره‌ی تغییرِ کالا، تعداد، قیمت یا مشتری، پیش‌فاکتور را به پیش‌نویس برمی‌گرداند و باید دوباره به تأیید
            مشتری و انبار برسد.
          </Notice>
        )}
        {openIssues > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatNumber(openIssues)} دانه‌ی معیوب/مفقود در بررسیِ انبار گزارش شده و منتظرِ تصمیمِ حسابداری است.
          </p>
        )}

        <ProformaEventHistory events={events} />
      </CardContent>
    </Card>
  );
}
