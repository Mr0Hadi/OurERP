// src/shared/components/print/BarcodeGraphic.jsx
import Barcode from "react-barcode";

import {
  BARCODE_PRESETS,
  DEFAULT_SYMBOLOGY,
} from "@/shared/services/barcode/barcodeConfig";
import { formatPayload, toPayload } from "@/shared/services/barcode/productCode";

/**
 * تک‌بارکد، مستقل از اینکه کجا استفاده می‌شود.
 *
 * تفکیکِ «چه چیزی داخل میله‌ها می‌رود» از «چه چیزی زیرش نوشته می‌شود»
 * عمدی است و عیناً همان کاری است که رندرِ سرور می‌کند
 * (`ZXingBarcodeRenderer.RenderCode128Svg(payload, humanReadableText, …)`):
 * داخلِ میله‌ها فقط رقم می‌رود (`BarcodePayload` — همان چیزی که سرور
 * موقع اسکن با آن مقایسه می‌کند) و زیرش شکلِ خط‌تیره‌دار برای خواندنِ
 * چشمی. اگر خط‌تیره‌ها هم داخلِ میله‌ها بروند، اسکنر رشته‌ای می‌فرستد
 * که با هیچ رکوردی برابر نیست.
 *
 * خروجی SVG است تا در چاپ با هر DPI تمیز دربیاید. SVG با عرض برچسب
 * مقیاس می‌گیرد؛ روی برچسب ۶۲ میلی‌متری، payloadِ ۲۸ رقمیِ یک دانه در
 * CODE128 (زیرمجموعه‌ی C، دو رقم در هر کاراکتر) جا می‌شود. اگر بعداً
 * برچسبِ کوچک‌تری لازم شد، بهتر است `preset` عوض شود نه اینکه بارکد
 * بازهم فشرده‌تر شود.
 */
export default function BarcodeGraphic({
  value,
  text,
  symbology = DEFAULT_SYMBOLOGY,
  preset = "label",
  displayValue = true,
}) {
  // ورودی می‌تواند شکلِ خوانا باشد یا payload؛ هر دو به payload تبدیل
  // می‌شوند تا فراخوان مجبور نباشد بداند کدام دستش است.
  const payload = toPayload(value);
  if (!payload) return null;

  const options = BARCODE_PRESETS[preset] ?? BARCODE_PRESETS.label;

  return (
    <div className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto">
      <Barcode
        value={payload}
        text={text || formatPayload(payload)}
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
