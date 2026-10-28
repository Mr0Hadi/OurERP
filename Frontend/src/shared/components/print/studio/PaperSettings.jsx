import { useId } from "react";
import { FileText } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import OptionSelect from "@/shared/components/forms/OptionSelect";
import {
  MARGIN_PRESETS,
  MARGIN_PRESET_LABELS,
  ORIENTATION_LABELS,
  PAPER_KEYS,
  PAPER_LIMITS,
  formatPaperSize,
  papersFor,
} from "../paper";
import PrintSettingsSection, { PrintSettingLabel } from "./PrintSettingsSection";
import SegmentedControl from "./SegmentedControl";
import { optionsFromLabels } from "@/shared/lib/options";

const ORIENTATION_OPTIONS = optionsFromLabels(ORIENTATION_LABELS);
const MARGIN_OPTIONS = optionsFromLabels(MARGIN_PRESET_LABELS);

/**
 * بخشِ «کاغذ» در پنلِ تنظیماتِ چاپ: اندازه، جهت و حاشیه. مقدارها همان
 * کلیدهای `DEFAULT_PAPER_SETTINGS` (`paper.js`) هستند؛ هندسه را مصرف‌کننده
 * با `pageGeometryOf` می‌سازد و برای خلاصه‌ی زیرِ بخش پاس می‌دهد.
 *
 * @param paperKeys   کاغذهای مجاز برای این برگه (پیش‌فرض: همه)
 * @param allowCustom گزینه‌ی «اندازه‌ی دلخواه»
 * @param geometry    خروجیِ `pageGeometryOf(settings)`
 */
export default function PaperSettings({ settings, geometry, onChange, paperKeys, allowCustom = true }) {
  const id = useId();
  const papers = papersFor(paperKeys);
  const isCustom = settings.paperKey === PAPER_KEYS.CUSTOM;

  return (
    <PrintSettingsSection title="کاغذ" icon={FileText}>
      <div className="space-y-1.5">
        <PrintSettingLabel htmlFor={`${id}-paper`}>اندازه‌ی کاغذ</PrintSettingLabel>
        <OptionSelect
          id={`${id}-paper`}
          dir="rtl"
          value={geometry.paperKey}
          onChange={(paperKey) => onChange({ paperKey })}
          className="h-10 w-full sm:h-9"
          options={[
            ...papers.map((paper) => ({
              value: paper.key,
              label: (
                <>
                  <span>{paper.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {paper.hint ?? formatPaperSize(paper.widthMm, paper.heightMm)}
                  </span>
                </>
              ),
            })),
            ...(allowCustom ? [{ value: PAPER_KEYS.CUSTOM, label: "اندازه‌ی دلخواه…" }] : []),
          ]}
        />
      </div>

      {isCustom && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <PrintSettingLabel htmlFor={`${id}-width`}>عرض (میلی‌متر)</PrintSettingLabel>
            <Input
              id={`${id}-width`}
              type="number"
              inputMode="decimal"
              min={PAPER_LIMITS.minWidthMm}
              max={PAPER_LIMITS.maxWidthMm}
              value={settings.customWidthMm}
              onChange={(event) => onChange({ customWidthMm: event.target.value })}
              className="h-10 sm:h-9"
            />
          </div>
          <div className="space-y-1">
            <PrintSettingLabel htmlFor={`${id}-height`}>ارتفاع (میلی‌متر)</PrintSettingLabel>
            <Input
              id={`${id}-height`}
              type="number"
              inputMode="decimal"
              min={PAPER_LIMITS.minHeightMm}
              max={PAPER_LIMITS.maxHeightMm}
              value={settings.customHeightMm}
              onChange={(event) => onChange({ customHeightMm: event.target.value })}
              className="h-10 sm:h-9"
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <PrintSettingLabel>جهت</PrintSettingLabel>
        <SegmentedControl
          ariaLabel="جهتِ کاغذ"
          value={geometry.orientation}
          options={ORIENTATION_OPTIONS}
          onChange={(orientation) => onChange({ orientation })}
          disabled={geometry.isRoll}
        />
      </div>

      <div className="space-y-1.5">
        <PrintSettingLabel>حاشیه</PrintSettingLabel>
        <SegmentedControl
          ariaLabel="حاشیه"
          value={settings.marginPreset}
          options={MARGIN_OPTIONS}
          onChange={(marginPreset) => onChange({ marginPreset })}
        />
        {settings.marginPreset === MARGIN_PRESETS.CUSTOM && (
          <div className="flex items-center gap-2 pt-1">
            <PrintSettingLabel htmlFor={`${id}-margin`}>حاشیه (میلی‌متر)</PrintSettingLabel>
            <Input
              id={`${id}-margin`}
              type="number"
              inputMode="decimal"
              min={0}
              max={PAPER_LIMITS.maxMarginMm}
              value={settings.customMarginMm}
              onChange={(event) => onChange({ customMarginMm: event.target.value })}
              className="h-9 w-24"
            />
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {formatPaperSize(geometry.widthMm, geometry.heightMm)} میلی‌متر، حاشیه‌ی{" "}
        {geometry.marginMm.toLocaleString("fa-IR")} میلی‌متر
        {geometry.isRoll && "؛ طولِ کاغذ به اندازه‌ی محتواست."}
      </p>
    </PrintSettingsSection>
  );
}
