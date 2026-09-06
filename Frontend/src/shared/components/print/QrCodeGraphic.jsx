// src/shared/components/print/QrCodeGraphic.jsx
import { useMemo } from "react";
// عمداً از مسیرِ عمیق و نه از بشکه‌ی `@zxing/library`: بشکه هر
// رمزگشای هر فرمتی را با خودش می‌آورد (~۴۵۰ کیلوبایت) در حالی که برای
// *ساختنِ* QR فقط همین دو ماژول لازم است. خودِ اسکنر همچنان از بشکه
// استفاده می‌کند، چون واقعاً به همه‌ی رمزگشاها نیاز دارد.
import BarcodeFormat from "@zxing/library/esm/core/BarcodeFormat";
import EncodeHintType from "@zxing/library/esm/core/EncodeHintType";
import QRCodeWriter from "@zxing/library/esm/core/qrcode/QRCodeWriter";

import { QR_PRESETS, QR_ERROR_CORRECTION } from "@/shared/services/barcode/barcodeConfig";
import { formatPayload, toPayload } from "@/shared/services/barcode/productCode";
import { cn } from "@/shared/lib/utils";

/**
 * همان شناسه‌ی بارکد، این‌بار به شکل QR — قرینه‌ی `BarcodeGraphic`.
 *
 * محتوای QR دقیقاً همان `payload`ِ رقمیِ داخلِ میله‌هاست، نه شکلِ
 * خط‌تیره‌دار: هر دو نماد باید موقعِ اسکن یک رشته‌ی یکسان بدهند، وگرنه
 * `parseBarcode`/`ScanBarcode` سرور برای QR جواب متفاوتی می‌داد. متنِ
 * خوانا هم مثل بارکد زیرش نوشته می‌شود.
 *
 * برای رمزگذاری از `QRCodeWriter`ِ همان `@zxing/library` استفاده شده که
 * از قبل برای *خواندن* در پروژه هست — پس وابستگیِ تازه‌ای اضافه نشده و
 * رمزگذار و رمزگشا یک کتابخانه‌اند. ماتریسِ خروجی به SVG تبدیل می‌شود
 * (نه canvas) تا مثل بارکد در چاپ با هر DPI تمیز دربیاید.
 */
export default function QrCodeGraphic({
  value,
  text,
  preset = "display",
  displayValue = true,
  className = "",
}) {
  const payload = toPayload(value);
  const options = QR_PRESETS[preset] ?? QR_PRESETS.display;

  // ماتریسِ QR فقط با عوض‌شدنِ محتوا یا حاشیه تغییر می‌کند؛ رمزگذاری
  // در هر رندر تکرار نشود.
  const matrix = useMemo(() => {
    if (!payload) return null;

    const hints = new Map();
    hints.set(EncodeHintType.ERROR_CORRECTION, QR_ERROR_CORRECTION);
    hints.set(EncodeHintType.MARGIN, options.margin);

    try {
      // عرض/ارتفاعِ صفر یعنی «هر ماژول یک واحد»: مقیاس را خودِ SVG با
      // viewBox می‌دهد، پس اینجا لازم نیست پیکسل حساب کنیم.
      return new QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 0, 0, hints);
    } catch {
      return null;
    }
  }, [payload, options.margin]);

  if (!matrix) return null;

  const size = matrix.getWidth();

  // هر ردیف به چند مستطیلِ ممتد تبدیل می‌شود، نه یک مستطیل به‌ازای هر
  // ماژول: خروجی SVG چند برابر کوچک‌تر می‌شود و در چاپ هم درزهای موییِ
  // بین ماژول‌های همسایه از بین می‌رود.
  const rects = [];
  for (let y = 0; y < matrix.getHeight(); y++) {
    let runStart = null;
    for (let x = 0; x <= size; x++) {
      const filled = x < size && matrix.get(x, y);
      if (filled && runStart === null) {
        runStart = x;
      } else if (!filled && runStart !== null) {
        rects.push(
          <rect
            key={`${y}-${runStart}`}
            x={runStart}
            y={y}
            width={x - runStart}
            height={1}
          />,
        );
        runStart = null;
      }
    }
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={options.size}
        height={options.size}
        shapeRendering="crispEdges"
        className="h-auto max-w-full"
        role="img"
        aria-label={`کد QR ${formatPayload(payload)}`}
      >
        <g fill="#000000">{rects}</g>
      </svg>

      {displayValue ? (
        <span
          className="font-mono text-black"
          style={{ fontSize: `${options.fontSize}px` }}
        >
          {text || formatPayload(payload)}
        </span>
      ) : null}
    </div>
  );
}
