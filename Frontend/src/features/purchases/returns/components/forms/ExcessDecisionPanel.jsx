import { PackageCheck, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { PriceInput } from "@/shared/components/ui/price-input";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";

/**
 * تصمیمِ کالای مازاد یا سفارش‌ندادهِ قرنطینه، کنارِ همان کالا در «اقلام و
 * مشکلات»: هر دانه یا به تامین‌کننده **عودت** می‌شود (ادعای مازاد/سفارش‌نداده
 * در همین مرجوعی) یا **نگه داشته و خریده** می‌شود (`AcceptPurchaseExcess`، با
 * همان دکمه‌ی ثبتِ صفحه). قبلاً خرید یک کارتِ جدا بالای صفحه بود.
 *
 * @param free        قرنطینه‌ی آزادِ این گروه (سقفِ سرور)
 * @param returned    مقدارِ ادعاهای عودتِ همین گروه
 * @param bought      مقدارِ خرید
 * @param unitPrice   مازاد: قیمتِ قلم (ثابت)؛ سفارش‌نداده: `null` و قابلِ ورود
 */
export default function ExcessDecisionPanel({
  title,
  free,
  returned,
  bought,
  unitPrice,
  priceEditable = false,
  unit = "عدد",
  onReturn,
  onBuyChange,
  onPriceChange,
}) {
  const undecided = Math.max(0, free - returned - bought);

  return (
    <div className="space-y-2 rounded-md border border-dashed border-caution/40 bg-caution/5 p-2.5 text-xs">
      <p className="text-card-foreground">
        <span className="font-medium">{title}</span>{" "}
        <span className="text-muted-foreground">
          {formatNumber(free)} {unit} آزاد در قرنطینه — هر دانه یا پس می‌رود یا نگه داشته و
          خریده می‌شود.
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">نگه‌داشتن و خرید:</span>
        <QuantityStepper
          value={bought}
          max={free - returned}
          onChange={onBuyChange}
          size="sm"
        />
        {priceEditable ? (
          bought > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">قیمتِ واحد:</span>
              <PriceInput
                min={0}
                value={unitPrice}
                onValueChange={onPriceChange}
                className="h-7 w-32 text-xs"
                aria-label="قیمتِ واحدِ فاکتور"
              />
            </div>
          )
        ) : (
          <span className="text-muted-foreground">
            هر عدد {formatRial(unitPrice)}
            {bought > 0 && ` · جمع ${formatRial(bought * (Number(unitPrice) || 0))}`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          disabled={undecided <= 0}
          onClick={onReturn}
        >
          <Undo2 className="h-3.5 w-3.5" />
          عودت به تامین‌کننده
        </Button>
        <span className="text-muted-foreground">
          {undecided > 0
            ? `${formatNumber(undecided)} ${unit} بی‌تصمیم`
            : "برای همه تصمیم گرفته شده"}
        </span>
        {bought > 0 && (
          <span className="flex items-center gap-1 text-success">
            <PackageCheck className="h-3.5 w-3.5" />
            خرید با «ثبت» انجام می‌شود؛ کالا تا بازگشت به موجودی در قرنطینه می‌ماند.
          </span>
        )}
      </div>
    </div>
  );
}
