import { LayoutList, RotateCcw, Table2, Type } from "lucide-react";

import PaperSettings from "@/shared/components/print/studio/PaperSettings";
import PrintSettingsSection from "@/shared/components/print/studio/PrintSettingsSection";
import SegmentedControl from "@/shared/components/print/studio/SegmentedControl";
import { optionsFromLabels } from "@/shared/components/print/studio/options";
import { TEXT_SCALE_LABELS } from "@/shared/components/print/typography";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  INVOICE_COLUMNS,
  INVOICE_PAPER_KEYS,
  INVOICE_SECTIONS,
  TABLE_STYLE_LABELS,
  WIDE_TABLE_MIN_WIDTH_MM,
  enabledColumnCount,
} from "./invoicePrintSettings";

const TABLE_STYLE_OPTIONS = optionsFromLabels(TABLE_STYLE_LABELS);
const TEXT_SCALE_OPTIONS = optionsFromLabels(TEXT_SCALE_LABELS);

/** چند گزینه‌ی روشن/خاموشِ یک شیءِ تنظیمات (ستون‌ها، بخش‌ها) در دو ستون. */
function ToggleGrid({ legend, options, values, onChange }) {
  return (
    <fieldset className="space-y-1">
      <legend className="mb-1 text-xs text-muted-foreground">{legend}</legend>
      <div className="grid grid-cols-2 gap-1">
        {options.map((option) => (
          <label
            key={option.key}
            className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1 text-sm hover:bg-accent/40"
          >
            <Checkbox
              checked={Boolean(values[option.key])}
              onCheckedChange={(checked) => onChange({ ...values, [option.key]: checked === true })}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * پنلِ تنظیماتِ چاپِ سندِ رسمی: بخش‌ها، جدول (شکل و ستون‌ها)، کاغذ و اندازه‌ی متن. هر تغییر فوراً در
 * پیش‌نمایش دیده می‌شود و برای همین نوعِ سند می‌ماند (`usePrintSettings`).
 */
export default function InvoicePrintSettingsPanel({ settings, geometry, update, reset }) {
  const crowded =
    geometry.contentWidthMm < WIDE_TABLE_MIN_WIDTH_MM && enabledColumnCount(settings.columns) > 3;

  return (
    <>
      <PrintSettingsSection title="بخش‌های سند" icon={LayoutList}>
        <ToggleGrid
          legend="روی برگه چاپ شود"
          options={INVOICE_SECTIONS}
          values={settings.sections}
          onChange={(sections) => update({ sections })}
        />
      </PrintSettingsSection>

      <PrintSettingsSection title="جدولِ اقلام" icon={Table2}>
        <SegmentedControl
          ariaLabel="شکلِ جدول"
          value={settings.tableStyle}
          options={TABLE_STYLE_OPTIONS}
          onChange={(tableStyle) => update({ tableStyle })}
        />
        <ToggleGrid
          legend="ستون‌های اختیاری (ردیف، شرح، تعداد، مبلغِ واحد و جمعِ کل همیشه هستند)"
          options={INVOICE_COLUMNS}
          values={settings.columns}
          onChange={(columns) => update({ columns })}
        />
        {crowded && (
          <p className="text-xs text-muted-foreground">
            این کاغذ برای همه‌ی ستون‌ها تنگ است؛ کاغذ را افقی کنید یا چند ستون را خاموش کنید.
          </p>
        )}
      </PrintSettingsSection>

      <PaperSettings settings={settings} geometry={geometry} onChange={update} paperKeys={INVOICE_PAPER_KEYS} />

      <PrintSettingsSection title="اندازه‌ی متن" icon={Type}>
        <SegmentedControl
          ariaLabel="اندازه‌ی متن"
          value={settings.textScale}
          options={TEXT_SCALE_OPTIONS}
          onChange={(textScale) => update({ textScale })}
        />
      </PrintSettingsSection>

      <Button type="button" variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" onClick={reset}>
        <RotateCcw className="size-3.5" />
        بازگشت به تنظیماتِ پیش‌فرض
      </Button>
    </>
  );
}
