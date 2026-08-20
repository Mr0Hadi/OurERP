// src/features/warehouse/units/components/UnitLabel.jsx
import BarcodeGraphic from "@/shared/components/print/BarcodeGraphic";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

/**
 * محتوای یک برچسب. عمداً در همین feature می‌ماند و نه در shared —
 * چیدمان صفحه و مکانیزم چاپ سراسری است، ولی «روی برچسب کالا چه
 * نوشته شود» تصمیم انبار است.
 *
 * سطر پایین (کد کالا، شماره‌ی سند منشأ، تاریخ) برای وقتی است که کسی
 * برچسب را با چشم می‌خواند: بدون اسکنر هم باید بشود فهمید این قلم چه
 * کالایی است و با کدام خرید وارد انبار شده.
 */
export default function UnitLabel({ unit }) {
  const receivedAt = unit.createdAt
    ? gregorianToPersian(unit.createdAt.slice(0, 10))
    : "";

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-black">
      <div className="max-w-full truncate text-[9px] font-medium leading-tight">
        {unit.productName}
      </div>

      <BarcodeGraphic value={unit.unitCode} preset="label" />

      <div className="flex w-full items-center justify-between gap-1 px-0.5 text-[7px] leading-tight text-neutral-700">
        <span className="truncate font-mono">{unit.productCode}</span>
        {unit.source?.refNumber ? (
          <span className="truncate font-mono">{unit.source.refNumber}</span>
        ) : null}
        <span className="shrink-0 tabular-nums">{receivedAt}</span>
      </div>
    </div>
  );
}
