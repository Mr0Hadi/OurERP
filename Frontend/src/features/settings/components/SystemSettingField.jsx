import { RotateCcw } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { cn } from "@/shared/lib/utils";
import { SETTING_TYPE, formatSettingValue, isCustomValue, serverValue } from "../domain/systemSetting";
import SettingNumberInput from "./SettingNumberInput";

/**
 * یک ردیفِ تنظیم، از روی تعریفِ سرور: عنوان و توضیح یک طرف، کنترل طرفِ دیگر (در موبایل
 * زیرِ هم). ردیفِ ویرایش‌شده‌ی ذخیره‌نشده نوارِ رنگی می‌گیرد.
 *
 * @param value    مقدارِ مؤثرِ پیش‌نویس (رشته)
 * @param error    پیامِ خطا یا `null`
 * @param readOnly بدونِ `SettingManage`
 */
export default function SystemSettingField({ setting, value, error, readOnly, onChange }) {
  const id = `setting-${setting.key}`;
  const dirty = value !== serverValue(setting);
  const custom = isCustomValue(setting, value);

  const control =
    setting.type === SETTING_TYPE.BOOLEAN ? (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{formatSettingValue(setting, value)}</span>
        <Switch
          id={id}
          checked={value === "true"}
          disabled={readOnly}
          onCheckedChange={(checked) => onChange(String(checked))}
        />
      </div>
    ) : setting.type === SETTING_TYPE.INTEGER ? (
      <SettingNumberInput
        id={id}
        value={value}
        fallback={setting.defaultValue}
        min={setting.minValue}
        max={setting.maxValue}
        unit={setting.unit}
        disabled={readOnly}
        invalid={Boolean(error)}
        onChange={onChange}
      />
    ) : (
      <Input
        id={id}
        className="md:w-64"
        value={value}
        maxLength={setting.maxLength ?? undefined}
        disabled={readOnly}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
    );

  const range =
    setting.type === SETTING_TYPE.INTEGER && setting.minValue != null && setting.maxValue != null
      ? `${setting.minValue} تا ${setting.maxValue}`
      : null;

  return (
    <div
      className={cn(
        "relative grid gap-3 py-4 ps-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6",
        "before:absolute before:inset-y-3 before:start-0 before:w-0.5 before:rounded-full",
        dirty ? "before:bg-primary" : "before:bg-transparent",
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={id} className="text-sm font-semibold">
            {setting.title}
          </Label>
          {dirty ? (
            <Badge variant="outline" className="border-primary/40 text-primary">ذخیره‌نشده</Badge>
          ) : (
            custom && <Badge variant="secondary">سفارشی</Badge>
          )}
        </div>
        {setting.description && (
          <p className="text-xs leading-6 text-muted-foreground">{setting.description}</p>
        )}
        <p className="text-[11px] text-muted-foreground/80">
          پیش‌فرض: {formatSettingValue(setting, setting.defaultValue)}
          {range && ` · بازه‌ی مجاز: ${range}`}
          {!dirty && !setting.isDefault && setting.updatedAt &&
            ` · آخرین تغییر: ${setting.updatedByName ?? "—"}، ${gregorianToPersianDateTime(setting.updatedAt)}`}
        </p>
      </div>

      <div className="flex flex-col items-start gap-1.5 md:items-end">
        <div className="flex items-center gap-1">
          {control}
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              // جا نگه داشته می‌شود تا کنترل با ظاهرشدنِ دکمه جابه‌جا نشود.
              className={cn("size-9 text-muted-foreground", !custom && "invisible")}
              title="بازگشت به پیش‌فرض"
              aria-label="بازگشت به پیش‌فرض"
              tabIndex={custom ? undefined : -1}
              onClick={() => onChange(setting.defaultValue)}
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
        </div>
        {error && <span className="text-xs font-medium text-destructive">{error}</span>}
      </div>
    </div>
  );
}
