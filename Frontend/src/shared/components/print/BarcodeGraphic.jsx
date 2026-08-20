// src/shared/components/print/BarcodeGraphic.jsx
import Barcode from "react-barcode";

import {
  BARCODE_PRESETS,
  DEFAULT_SYMBOLOGY,
} from "@/shared/services/barcode/barcodeConfig";

/**
 * تک‌بارکد، مستقل از اینکه کجا استفاده می‌شود.
 *
 * خروجی SVG است تا در چاپ با هر DPI تمیز دربیاید. SVG با عرض برچسب
 * مقیاس می‌گیرد؛ روی برچسب ۶۳ میلی‌متری، یک کد ۱۹ کاراکتری CODE128
 * حدود ۰٫۲۶ میلی‌متر پهنای باریک‌ترین میله می‌دهد که برای اسکنرهای
 * معمول انبار کافی است. اگر بعداً برچسبِ کوچک‌تری لازم شد، بهتر است
 * طول کد کم شود نه اینکه بارکد بازهم فشرده‌تر شود.
 */
export default function BarcodeGraphic({
  value,
  symbology = DEFAULT_SYMBOLOGY,
  preset = "label",
  displayValue = true,
}) {
  if (!value) return null;

  const options = BARCODE_PRESETS[preset] ?? BARCODE_PRESETS.label;

  return (
    <div className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto">
      <Barcode
        value={value}
        format={symbology}
        renderer="svg"
        width={options.width}
        height={options.height}
        fontSize={options.fontSize}
        margin={options.margin}
        displayValue={displayValue}
        background="transparent"
        lineColor="#000000"
      />
    </div>
  );
}
