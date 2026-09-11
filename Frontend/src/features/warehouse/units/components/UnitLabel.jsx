import BarcodeGraphic from "@/shared/components/print/BarcodeGraphic";
import QrCodeGraphic from "@/shared/components/print/QrCodeGraphic";
import {
  DEFAULT_LABEL_CODE_KIND,
  LABEL_CODE_KINDS,
} from "@/shared/domain/barcode/barcodeConfig";
import { barcodeSegments } from "@/shared/domain/barcode/productCode";

/**
 * محتوای یک برچسب. عمداً در همین feature می‌ماند و نه در shared —
 * چیدمان صفحه و مکانیزم چاپ سراسری است، ولی «روی برچسب کالا چه
 * نوشته شود» تصمیم انبار است.
 *
 * روی برچسب فقط نامِ کالا و بارکدِ سه‌بخشیِ خودِ دانه می‌رود — همان
 * چیزی که `GetProductLabelsPdf` سرور هم چاپ می‌کند. تاریخِ ساخت و کدِ
 * کالا (گروهِ دانه) عمداً نیستند: کدِ کالا همان دو بخشِ اولِ بارکدِ دانه
 * است و تکرارش فقط جای برچسب را می‌گرفت.
 *
 * `codeKind` فقط شکلِ نماد را عوض می‌کند، نه محتوایش: هر دو همان
 * `barcodePayload` را حمل می‌کنند، پس یک برچسبِ QR و یک برچسبِ خطی از
 * یک دانه موقعِ اسکن دقیقاً یک رشته می‌دهند.
 */
export default function UnitLabel({
  unit,
  codeKind = DEFAULT_LABEL_CODE_KIND,
}) {
  // برچسب‌ها پهن‌اند و کوتاه (۶۲×۳۳ تا ۹۳×۵۳ میلی‌متر). بارکدِ خطی خودش
  // پهن است و در چیدمانِ عمودی جا می‌افتد، ولی QR مربع است: اگر همان‌جا
  // بگذاریمش، ارتفاعِ کمِ برچسب اندازه‌اش را خفه می‌کند و بقیه‌ی عرض
  // خالی می‌ماند. پس QR می‌رود کنارِ متن، نه بالای آن.
  if (codeKind === LABEL_CODE_KINDS.QR) {
    return (
      <div className="flex h-full w-full items-center gap-1.5 px-1.5 text-black">
        <QrCodeGraphic
          value={unit.barcodePayload}
          preset="label"
          displayValue={false}
          className="h-full w-auto shrink-0 py-1 [&_svg]:h-full [&_svg]:w-auto"
        />

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <div className="line-clamp-2 text-[9px] font-medium leading-tight">
            {unit.productName}
          </div>

          {/* کدِ کامل در ستونِ باریکِ کنارِ QR در یک سطر جا نمی‌شود و
              بریده می‌شد. شکستنش از روی همان سه مرزِ معنادارِ خودش است
              نه از روی عرضِ ظرف، پس روی باریک‌ترین برچسب هم کامل خوانده
              می‌شود. */}
          <div className="flex flex-col gap-px font-mono text-[8px] leading-tight">
            {barcodeSegments(unit.barcode).map((segment, index) => (
              <span key={index} className="tabular-nums">
                {segment}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-black">
      <div className="max-w-full truncate text-[9px] font-medium leading-tight">
        {unit.productName}
      </div>

      {/* میله‌ها payload می‌گیرند و متنِ زیرشان شکلِ خط‌تیره‌دار — همان
          تفکیکی که رندرِ PDF سرور دارد. */}
      <BarcodeGraphic
        value={unit.barcodePayload}
        text={unit.barcode}
        preset="label"
      />
    </div>
  );
}
