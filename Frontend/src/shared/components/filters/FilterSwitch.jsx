import { useId } from "react";

import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";

/**
 * فیلترِ بولینِ سرور («فقط سررسیدگذشته‌ها»، «باطل‌شده‌ها هم بیایند») — یک کلید با برچسب،
 * هم‌ارتفاعِ بقیه‌ی فیلدهای `FilterPanel`. خاموش یعنی پیش‌فرضِ سرور.
 */
export default function FilterSwitch({ label, checked, onChange, hint }) {
  const id = useId();
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 rounded-lg border border-input px-3 py-1.5 dark:bg-input/30">
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium text-foreground">
          {label}
        </Label>
        {hint && <p className="text-[11px] leading-4 text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={Boolean(checked)} onCheckedChange={onChange} />
    </div>
  );
}
