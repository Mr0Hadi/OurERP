import { RotateCcw } from "lucide-react";

import FormField from "@/shared/components/forms/FormField";
import { Button } from "@/shared/components/ui/button";
import { CitySelector, CitySelectorCity, CitySelectorProvince } from "@/shared/components/ui/city-selector";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { persianProvinces } from "@/shared/lib/persianProvinces";
import { normalizePersianDigits } from "@/shared/lib/persianDigits";
import { cn } from "@/shared/lib/utils";
import { CITY_KEY, PROVINCE_KEY, serverValue, textKind } from "../domain/systemSetting";

/**
 * گروهِ تنظیم‌های متنی به شکلِ فرمِ معمولی (برچسب بالای ورودی، دو ستون در دسکتاپ) — مثلِ
 * مشخصاتِ شرکت برای سربرگِ اسناد. استان و شهر با `CitySelector`ِ مشترک انتخاب می‌شوند.
 *
 * @param valueOf  `(setting) => string` مقدارِ پیش‌نویس
 * @param onChange `(key, value) => void`
 */
export default function TextSettingsForm({ settings, valueOf, readOnly, onChange }) {
  const province = settings.find((s) => s.key === PROVINCE_KEY);
  const city = settings.find((s) => s.key === CITY_KEY);
  const pairCity = province && city;

  return (
    <div className="grid gap-x-6 gap-y-5 py-5 md:grid-cols-2">
      {settings.map((setting) => {
        if (pairCity && setting.key === CITY_KEY) return null;
        if (pairCity && setting.key === PROVINCE_KEY) {
          return (
            <LocationField
              key="location"
              province={province}
              city={city}
              valueOf={valueOf}
              readOnly={readOnly}
              onChange={onChange}
            />
          );
        }
        return (
          <TextField
            key={setting.key}
            setting={setting}
            value={valueOf(setting)}
            readOnly={readOnly}
            onChange={(value) => onChange(setting.key, value)}
          />
        );
      })}
    </div>
  );
}

function TextField({ setting, value, readOnly, onChange }) {
  const id = `setting-${setting.key}`;
  const kind = textKind(setting);
  const dirty = value !== serverValue(setting);
  const limit = setting.maxLength ?? undefined;
  const handle = (raw) => onChange(kind === "digits" ? normalizePersianDigits(raw).replace(/\D/g, "") : raw);

  const common = {
    id,
    value,
    maxLength: limit,
    disabled: readOnly,
    placeholder: setting.defaultValue || undefined,
    onChange: (e) => handle(e.target.value),
    className: cn("flex-1", dirty && "border-primary"),
  };

  return (
    <div className={cn(kind === "multiline" && "md:col-span-2")}>
      <FormField label={setting.title} htmlFor={id} hint={setting.description}>
        <div className="flex items-start gap-1">
          {kind === "multiline" ? (
            <Textarea rows={3} {...common} />
          ) : (
            <Input {...common} dir={kind === "digits" ? "ltr" : undefined} inputMode={kind === "digits" ? "numeric" : undefined} />
          )}
          {!readOnly && dirty && <UndoButton onClick={() => onChange(serverValue(setting))} />}
        </div>
      </FormField>
    </div>
  );
}

function LocationField({ province, city, valueOf, readOnly, onChange }) {
  const selectedProvince = persianProvinces.find((p) => p.name === valueOf(province)) ?? null;
  const selectedCity = selectedProvince?.cities.find((c) => c.name === valueOf(city)) ?? null;
  const dirty = valueOf(province) !== serverValue(province) || valueOf(city) !== serverValue(city);

  return (
    <div className="space-y-1.5 md:col-span-2">
      <div className="flex items-center gap-1">
        <p className="text-sm font-medium">
          {province.title} و {city.title}
        </p>
        {dirty && <span className="size-1.5 rounded-full bg-primary" title="ذخیره‌نشده" />}
        {!readOnly && dirty && (
          <UndoButton
            onClick={() => {
              onChange(province.key, serverValue(province));
              onChange(city.key, serverValue(city));
            }}
          />
        )}
      </div>
      <CitySelector
        value={{ province: selectedProvince, city: selectedCity }}
        onValueChange={(next) => {
          onChange(province.key, next.province?.name ?? "");
          onChange(city.key, next.city?.name ?? "");
        }}
        disabled={readOnly}
        className="grid gap-3 sm:grid-cols-2"
      >
        <CitySelectorProvince className="w-full sm:w-full" />
        <CitySelectorCity className="w-full sm:w-full" />
      </CitySelector>
      <span className="block text-xs text-muted-foreground">{province.description}</span>
    </div>
  );
}

function UndoButton({ onClick }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0 text-muted-foreground"
      title="برگرداندن به مقدارِ ذخیره‌شده"
      aria-label="برگرداندن به مقدارِ ذخیره‌شده"
      onClick={onClick}
    >
      <RotateCcw className="size-4" />
    </Button>
  );
}
