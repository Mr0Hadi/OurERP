import { ArrowLeft, Ban, Ellipsis } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

/**
 * کارهای کمتر رایجِ فاکتورِ صادرشده در یک منو: تغییرِ دستیِ وضعیت (پیش‌نویس
 * تا «ثبت تغییرات») و لغو (با تأیید، همان لحظه). مرجوعی اگر ممکن است در منو
 * نیست؛ دکمه‌ی خودش را در سرِ صفحه دارد.
 *
 * @param transitions `[{ value, label, hint }]` — مقصدهای مجاز (غیر از لغو)
 * @param onTransition `(value) => void`
 * @param onCancel     لغو؛ بی آن گزینه دیده نمی‌شود
 */
export default function IssuedStatusMenu({ transitions = [], onTransition, onCancel, cancelLabel }) {
  if (!transitions.length && !onCancel) return null;

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="کارهای بیشتر" title="کارهای بیشتر">
          <Ellipsis className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={12} className="w-64">
        {transitions.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">تغییرِ وضعیت</DropdownMenuLabel>
            {transitions.map((transition) => (
              <DropdownMenuItem
                key={transition.value}
                onSelect={() => onTransition(transition.value)}
                className="flex-col items-start gap-0.5"
              >
                <span className="flex items-center gap-2">
                  <ArrowLeft className="size-3.5" />
                  {transition.label}
                </span>
                {transition.hint && (
                  <span className="ps-5.5 text-[11px] text-muted-foreground">{transition.hint}</span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
        {transitions.length > 0 && onCancel && <DropdownMenuSeparator />}
        {onCancel && (
          <DropdownMenuItem variant="destructive" onSelect={onCancel}>
            <Ban className="size-4" />
            {cancelLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
