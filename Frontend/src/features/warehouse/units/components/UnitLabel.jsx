// src/features/warehouse/units/components/UnitLabel.jsx
import BarcodeGraphic from "@/shared/components/print/BarcodeGraphic";

/**
 * محتوای یک برچسب. عمداً در همین feature می‌ماند و نه در shared —
 * چیدمان صفحه و مکانیزم چاپ سراسری است، ولی «روی برچسب کالا چه
 * نوشته شود» تصمیم انبار است.
 */
export default function UnitLabel({ unit }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-1 text-black">
      <div className="text-[9px] font-medium truncate max-w-full leading-tight">
        {unit.productName}
      </div>
      <BarcodeGraphic value={unit.unitCode} preset="label" />
      <div className="text-[8px] text-neutral-600 leading-tight">
        {unit.productCode}
      </div>
    </div>
  );
}
