import { AlertTriangle, CheckCircle, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * دکمه‌های پایینِ ستونِ کناریِ صفحه‌های کارِ انبار (دریافت، ارسال، دورِ کالای
 * مرجوعی): «ثبت» و «انصراف»، دلیلی که ثبت را بسته، و یک خط راهنما.
 *
 * دکمه‌ی ثبتِ دورِ ناقص (چیزی هنوز می‌ماند) رنگِ هشدار و آیکنِ مثلث دارد تا
 * انباردار پیش از کلیک ببیند که این دور همه‌چیز را تمام نمی‌کند.
 *
 * @param {object} props
 * @param {string} props.label متنِ دکمه‌ی ثبت
 * @param {boolean} props.complete این دور همه‌ی باقیمانده را می‌پوشاند
 * @param {boolean} [props.warnIncomplete] رنگِ هشدار وقتی `complete` نیست (پیش‌فرض روشن)
 * @param {boolean} props.canSubmit چیزی برای ثبت هست
 * @param {string|null} [props.blockingReason] دلیلی که سرور با آن رد می‌کند؛ ثبت بسته است
 * @param {boolean} props.isBusy
 * @param {() => void} props.onSubmit معمولاً بازکردنِ دیالوگِ تأیید
 * @param {() => void} props.onCancel
 * @param {React.ReactNode} [props.hint]
 */
export default function WarehouseSubmitBar({
  label,
  complete,
  warnIncomplete = true,
  canSubmit,
  blockingReason = null,
  isBusy,
  onSubmit,
  onCancel,
  hint,
}) {
  const warn = warnIncomplete && !complete;
  return (
    <>
      {blockingReason && canSubmit && (
        <p className="text-xs text-destructive px-1">{blockingReason}</p>
      )}

      <div className="flex gap-2">
        <Button
          className={`flex-1 gap-2 ${warn ? "bg-warning hover:bg-warning/90 text-white" : ""}`}
          disabled={isBusy || !canSubmit || Boolean(blockingReason)}
          onClick={onSubmit}
        >
          {complete ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {label}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy} className="gap-2">
          <X className="h-4 w-4" />
          انصراف
        </Button>
      </div>

      {hint && <p className="text-xs text-muted-foreground text-center px-2">{hint}</p>}
    </>
  );
}
