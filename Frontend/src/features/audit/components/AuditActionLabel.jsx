import { toneSolid } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { actionGroupOf, actionTitleOf } from "../domain/auditEnums";

/**
 * عنوانِ عملیاتِ یک رویداد با نقطه‌ی رنگیِ گروهش (خرید، فروش، کاربران، ...) — رنگ فقط کمکِ
 * چشم است و گروه در `title` هم آمده.
 */
export default function AuditActionLabel({ event, className }) {
  const group = actionGroupOf(event.action);
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)} title={group.label}>
      <span className={cn("size-2 shrink-0 rounded-full", toneSolid(group.tone))} aria-hidden />
      <span className="truncate">{actionTitleOf(event)}</span>
    </span>
  );
}
