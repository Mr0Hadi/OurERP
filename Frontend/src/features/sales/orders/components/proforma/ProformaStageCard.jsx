import { Check, ChevronDown, Clock, History, PackageSearch, TriangleAlert, Wallet } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import Notice from "@/shared/components/feedback/Notice";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
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

const STEPS = ["پیش‌فاکتور", "تأیید مشتری", "تأیید انبار", "دریافت و صدور"];

/**
 * مرحله‌ی پیش‌فاکتور در چرخه‌ی تأیید و کارِ بعدیِ همان مرحله:
 *  - پیش‌نویس: «مشتری تأیید کرد» (اگر انبار کسری گزارش کرده، دلیلش بالای کارت)
 *  - در انتظار انبار: پیوند به صفحه‌ی بررسیِ انبار (برای کسی که دسترسی دارد)
 *  - آماده‌ی پرداخت: شمارشِ معکوسِ رزرو و «ثبت دریافت»
 *
 * @param secondsLeft      از `useReservationCountdown`
 * @param documentChanged  خودِ پیش‌فاکتور ذخیره‌نشده تغییر کرده (تأیید باید پس از ذخیره باشد)
 * @param onApprove        `() => void`؛ خالی ⇒ دکمه نیست (بی‌دسترسی)
 * @param onStartPayment   `() => void`؛ خالی ⇒ دکمه نیست
 */
export default function ProformaStageCard({
  sale,
  secondsLeft,
  documentChanged,
  onApprove,
  approving,
  canCheckWarehouse,
  onStartPayment,
}) {
  const stage = Number(sale.proformaStage ?? SaleProformaStageEnum.DRAFT);
  const events = sale.proformaEvents || [];
  const last = events.at(-1);
  const shortage = stage === SaleProformaStageEnum.DRAFT && last?.kind === SaleProformaEventEnum.WAREHOUSE_SHORTAGE;
  const expired = stage === SaleProformaStageEnum.WAREHOUSE_CHECKED && secondsLeft === 0;
  const openIssues = (sale.warehouseIssues || []).filter((issue) => issue.resolution == null).length;

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">مسیر تأیید پیش‌فاکتور</CardTitle>
        <StatusBadge tone={SALE_PROFORMA_STAGE_TONES[stage]}>{SALE_PROFORMA_STAGE_LABELS[stage]}</StatusBadge>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="grid grid-cols-4 gap-1" aria-label="مرحله‌ها">
          {STEPS.map((step, index) => {
            // پیش‌نویس یعنی پیش‌فاکتور ساخته شده و گامِ در جریان «تأیید مشتری» است، و همین‌طور تا آخر.
            const done = index <= stage;
            const current = index === stage + 1;
            return (
              <li key={step} className="space-y-1.5" aria-current={current ? "step" : undefined}>
                <div
                  className={cn(
                    "h-1.5 rounded-full",
                    done ? "bg-primary" : current ? "bg-primary/40" : "bg-muted",
                  )}
                />
                <p
                  className={cn(
                    "flex items-center gap-1 text-[11px] leading-4 md:text-xs",
                    current ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {done && <Check className="size-3 shrink-0 text-primary" />}
                  <span className="hidden sm:inline">{index + 1}. </span>
                  {step}
                </p>
              </li>
            );
          })}
        </ol>

        {shortage && (
          <Notice tone="danger" icon={TriangleAlert}>
            <span className="font-semibold">انبار کسری گزارش کرد{last.userName ? ` (${last.userName})` : ""}: </span>
            {last.note || "همه‌ی کالاها موجود نبود."} پیش‌فاکتور را با مشتری اصلاح و دوباره تأیید کنید.
          </Notice>
        )}

        {documentChanged && stage !== SaleProformaStageEnum.DRAFT && (
          <Notice tone="caution">
            تغییرِ کالا، تعداد، قیمت، مشتری یا شیوه‌ی پرداخت با ذخیره، پیش‌فاکتور را به پیش‌نویس برمی‌گرداند و تأییدها باید
            دوباره گرفته شوند{stage === SaleProformaStageEnum.WAREHOUSE_CHECKED ? " (رزروِ ردیف‌های تغییرنکرده می‌ماند)" : ""}.
          </Notice>
        )}

        {stage === SaleProformaStageEnum.DRAFT && (
          <StageAction
            text="پیش‌فاکتور را به مشتری بدهید؛ وقتی تأیید کرد، ثبتش کنید تا به صفِ انبار برود."
            action={
              onApprove && (
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={approving || documentChanged}
                  title={documentChanged ? "اول تغییرات را ذخیره کنید" : undefined}
                  onClick={onApprove}
                >
                  <Check className="size-4" />
                  {approving ? "در حال ثبت…" : "مشتری تأیید کرد"}
                </Button>
              )
            }
            hint={documentChanged && onApprove ? "اول تغییراتِ پیش‌فاکتور را ذخیره کنید؛ مشتری نسخه‌ی ذخیره‌شده را تأیید می‌کند." : null}
          />
        )}

        {stage === SaleProformaStageEnum.CUSTOMER_APPROVED && (
          <StageAction
            text="در صفِ انبار: انباردار کالاها را برمی‌دارد و اسکن می‌کند تا برای این مشتری رزرو شوند."
            action={
              canCheckWarehouse && (
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to={routeWithId(ROUTES.WAREHOUSE_SALE_CHECK_DETAIL, sale.id)}>
                    <PackageSearch className="size-4" />
                    بررسی انبار
                  </Link>
                </Button>
              )
            }
          />
        )}

        {stage === SaleProformaStageEnum.WAREHOUSE_CHECKED && (
          <StageAction
            text={
              expired
                ? "مهلتِ رزرو تمام شد و پرداخت پذیرفته نمی‌شود. کالا به‌زودی به موجودی برمی‌گردد و انبار باید دوباره بررسی کند."
                : "کالا برای این مشتری رزرو شده است. با اولین دریافت، فاکتور صادر می‌شود."
            }
            badge={
              secondsLeft != null && (
                <StatusBadge tone={expired ? "danger" : secondsLeft < 120 ? "caution" : "info"} icon={Clock}>
                  <span className="tabular-nums" dir="ltr">
                    {expired ? "مهلت تمام شد" : formatCountdown(secondsLeft)}
                  </span>
                </StatusBadge>
              )
            }
            action={
              onStartPayment &&
              !expired && (
                <Button type="button" size="sm" className="gap-1.5" onClick={onStartPayment}>
                  <Wallet className="size-4" />
                  ثبت دریافت
                </Button>
              )
            }
          />
        )}

        {openIssues > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatNumber(openIssues)} دانه‌ی معیوب/مفقود در بررسیِ انبار گزارش شده و منتظرِ تصمیمِ حسابداری است (پیش‌فاکتور
            منتظرِ آن نمی‌ماند).
          </p>
        )}

        {events.length > 0 && <EventHistory events={events} />}
      </CardContent>
    </Card>
  );
}

function StageAction({ text, badge, action, hint }) {
  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 basis-56 text-sm leading-6">{text}</p>
        <div className="flex items-center gap-2">
          {badge}
          {action}
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
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
