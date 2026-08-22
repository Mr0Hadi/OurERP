import { useState } from "react";
import { PackagePlus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

/**
 * ثبت «کالای اضافه» یک قلم — تعدادی از همین کالا که بیشتر از سفارش
 * رسیده است.
 *
 * چرا یک فیلد جداست و به شمارنده‌ی دریافتی اضافه نمی‌شود: مقدار
 * دریافتی یعنی «چقدر از این سفارش تحویل شد» و سقفش خودِ سفارش است؛
 * تمام محاسبات پایین‌دست (کسری، قابل دریافت، وضعیت خرید) روی همان
 * معنا بنا شده‌اند. مازاد بیرون از سفارش است و مسیر خودش را دارد.
 *
 * برخلاف کسری، مازاد از روی تعدادها قابل حدس‌زدن نیست، پس تا وقتی
 * انباردار بازش نکند فقط یک دکمه‌ی کوچک است — نه یک نوار همیشه‌باز
 * روی تک‌تک ردیف‌های یک رسید بیست‌قلمی.
 */
export default function ExcessEntryStrip({ item, onExcessChange }) {
  const excessQty = Number(item.excessQty) || 0;
  const [isOpen, setIsOpen] = useState(excessQty > 0);

  if (!isOpen) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-sky-700 dark:hover:text-sky-400"
        onClick={() => setIsOpen(true)}
      >
        <PackagePlus className="h-3.5 w-3.5" />
        کالای اضافه دریافت شد
      </Button>
    );
  }

  const handleClose = () => {
    onExcessChange(item.lineId, "excessQty", 0);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-sky-300 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/10 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-card-foreground flex items-center gap-1.5">
          <PackagePlus className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          کالای اضافه (بیشتر از سفارش)
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
        <Input
          type="number"
          min={0}
          value={excessQty}
          onChange={(e) =>
            onExcessChange(item.lineId, "excessQty", e.target.value)
          }
          className="h-8 text-center text-xs sm:w-20 shrink-0"
        />
        <Input
          placeholder="یادداشت (اختیاری)..."
          value={item.excessNote || ""}
          onChange={(e) =>
            onExcessChange(item.lineId, "excessNote", e.target.value)
          }
          className="h-8 text-xs flex-1"
          disabled={excessQty <= 0}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {excessQty > 0 ? (
          <>
            {excessQty.toLocaleString("fa-IR")} عدد اضافه ثبت می‌شود. این تعداد
            وارد موجودی قابل‌فروش نمی‌شود تا واحد خرید تصمیم بگیرد عودت داده
            شود یا نگه داشته شود.
          </>
        ) : (
          "تعداد کالایی که بیشتر از سفارش تحویل گرفته‌اید را وارد کنید."
        )}
      </p>
    </div>
  );
}
