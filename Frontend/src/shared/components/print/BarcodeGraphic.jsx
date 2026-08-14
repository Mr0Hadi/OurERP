// src/shared/components/print/BarcodeGraphic.jsx
import Barcode from "react-barcode";

import {
  BARCODE_PRESETS,
  DEFAULT_SYMBOLOGY,
} from "@/shared/services/barcode/barcodeConfig";

/**
 * تک‌بارکد، مستقل از اینکه کجا استفاده می‌شود.
 *
 * خروجی SVG است تا در چاپ با هر DPI تمیز دربیاید (bitmap در چاپ
 * پیکسلی می‌شود). symbology عمداً prop است تا اگر بعداً روی QR یا
 * فرمت دیگری تصمیم گرفته شد، فقط همین مقدار عوض شود.
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
  );
}
