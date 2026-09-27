import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";

import { toneSoft } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

const DEFAULT_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  caution: AlertTriangle,
  danger: OctagonAlert,
};

/**
 * باکسِ توضیح/هشدارِ درون‌صفحه‌ای («این فیلد فقط وقتی ذخیره می‌شود که …»).
 *
 * جای باکس‌های دست‌سازِ `rounded-lg border border-amber-300 bg-amber-50 …`
 * که هر کدام حاشیه، فاصله و dark modeِ خودشان را داشتند.
 *
 * @param {object} props
 * @param {string} [props.tone] یکی از `TONES`؛ پیش‌فرض `warning`
 * @param {React.ComponentType|false} [props.icon] آیکنِ دلخواه؛ `false` یعنی بدون آیکن
 * @param {boolean} [props.dashed] حاشیه‌ی خط‌چین برای ناحیه‌ی «پیش‌نویس/قابل ویرایش»
 */
export default function Notice({
  tone = "warning",
  icon,
  dashed = false,
  className,
  children,
  ...props
}) {
  const Icon = icon === false ? null : (icon ?? DEFAULT_ICONS[tone]);

  return (
    <div
      role={tone === "danger" ? "alert" : "note"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-5",
        toneSoft(tone),
        dashed && "border-dashed",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="mt-0.5 size-3.5 shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
