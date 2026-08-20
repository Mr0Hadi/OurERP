// src/shared/components/print/LabelSheet.jsx
import {
  getSheetPreset,
  paginateItems,
  DEFAULT_SHEET_PRESET,
} from "./sheetPresets";

/**
 * برچسب‌ها را روی صفحه‌های مشخص می‌چیند.
 *
 * صفحه‌بندی صریح است و به شکستِ خودکارِ مرورگر سپرده نمی‌شود: مرورگرها
 * grid را در چاپ به‌درستی بین صفحه‌ها تکه نمی‌کنند و ردیف‌های مرزی
 * حذف یا نصفه می‌شوند. با ساختِ یک بلوکِ هم‌اندازه‌ی صفحه به‌ازای هر
 * صفحه، هم خروجی قطعی می‌شود و هم شمارنده‌ی «چند صفحه» دقیقاً همان
 * چیزی است که چاپ می‌شود.
 *
 * از محتوای برچسب بی‌خبر است: هر ماژول renderItem خودش را می‌دهد، پس
 * برای چاپ فاکتور هم قابل استفاده است.
 */
export default function LabelSheet({
  items,
  renderItem,
  presetKey = DEFAULT_SHEET_PRESET,
  getItemKey = (item, index) => item.id ?? index,
}) {
  const preset = getSheetPreset(presetKey);
  const pages = paginateItems(items, preset);

  return (
    <div data-print-root className="flex flex-col items-center gap-4">
      {pages.map((pageItems, pageIndex) => (
        <div
          key={pageIndex}
          className="print-page bg-white text-black shadow-sm"
          style={{
            width: `${preset.pageWidthMm}mm`,
            height: `${preset.pageHeightMm}mm`,
            padding: `${preset.pageMarginMm}mm`,
          }}
        >
          <div
            className="grid content-start"
            style={{
              gridTemplateColumns: `repeat(${preset.columns}, ${preset.labelWidthMm}mm)`,
              gridAutoRows: `${preset.labelHeightMm}mm`,
              gap: `${preset.gapMm}mm`,
              justifyContent: "center",
            }}
          >
            {pageItems.map((item, index) => (
              <div
                key={getItemKey(item, pageIndex * preset.perPage + index)}
                className="print-label flex flex-col items-center justify-center overflow-hidden"
              >
                {renderItem(item)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
