// src/shared/components/print/LabelSheet.jsx
import { SHEET_PRESETS, DEFAULT_SHEET_PRESET } from "./sheetPresets";

/**
 * چیدمان شبکه‌ای برچسب‌ها روی صفحه، بر حسب میلی‌متر.
 *
 * از محتوای برچسب بی‌خبر است: هر ماژولی renderItem خودش را می‌دهد.
 * همین باعث می‌شود بعداً برای چاپ فاکتور هم قابل استفاده باشد بدون
 * اینکه چیزی از انبار اینجا نشت کند.
 */
export default function LabelSheet({
  items,
  renderItem,
  presetKey = DEFAULT_SHEET_PRESET,
  getItemKey = (item, index) => item.id ?? index,
}) {
  const preset = SHEET_PRESETS[presetKey] ?? SHEET_PRESETS[DEFAULT_SHEET_PRESET];

  return (
    <div
      data-print-root
      className="bg-white text-black mx-auto"
      style={{ padding: `${preset.pageMarginMm}mm` }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${preset.columns}, ${preset.labelWidthMm}mm)`,
          gap: `${preset.gapMm}mm`,
          justifyContent: "center",
        }}
      >
        {items.map((item, index) => (
          <div
            key={getItemKey(item, index)}
            className="print-label border border-dashed border-neutral-300 flex flex-col items-center justify-center overflow-hidden"
            style={{
              width: `${preset.labelWidthMm}mm`,
              height: `${preset.labelHeightMm}mm`,
            }}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
