import Barcode from "react-barcode";

import {
  BARCODE_PRESETS,
  DEFAULT_SYMBOLOGY,
} from "@/shared/domain/barcode/barcodeConfig";

/**
 * تک‌بارکد، مستقل از اینکه کجا استفاده می‌شود.
 *
 * تفکیکِ «چه چیزی داخل میله‌ها می‌رود» از «چه چیزی زیرش نوشته می‌شود»
 * عمدی است و عیناً همان کاری است که رندرِ سرور می‌کند
 * (`ZXingBarcodeRenderer.RenderCode128Svg(payload, humanReadableText, …)`):
 * داخلِ میله‌ها خودِ کد با خط‌تیره‌هایش می‌رود (`14050608-10-3` —
 * همان `BarcodePayload` سرور) و زیرش، اگر فراخوان متنِ دیگری نداده،
 * همان کد. اسکنر همان رشته را برمی‌گرداند و `parseBarcode` از روی
 * خط‌تیره‌ها بخش‌ها را جدا می‌کند.
 *
 * خروجی SVG است تا در چاپ با هر DPI تمیز دربیاید. SVG با عرض برچسب
 * مقیاس می‌گیرد؛ CODE128 رقم‌ها را دوتا‌دوتا (زیرمجموعه‌ی C) و
 * خط‌تیره را تکی (زیرمجموعه‌ی B) رمز می‌کند. اگر بعداً
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
  const content = String(value ?? "").trim();
  if (!content) return null;

  const options = BARCODE_PRESETS[preset] ?? BARCODE_PRESETS.label;

  return (
    <div className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto">
      <Barcode
        value={content}
        text={text || content}
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
