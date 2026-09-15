import { X } from "lucide-react";
import { toast } from "react-hot-toast";

import { Badge } from "@/shared/components/ui/badge";
import BarcodeScanField from "./BarcodeScanField";
import { parseBarcode } from "@/shared/domain/barcode/productCode";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * فهرستِ بارکدِ دانه‌هایی که در یک جابه‌جایی اسکن شده‌اند.
 *
 * سرور تعداد را با `quantity` می‌سنجد و دانه‌ی ناموجود/تکراری را رد می‌کند؛
 * این‌جا فقط خطاهای قابلِ تشخیص بدون سرور زودتر گفته می‌شوند: بارکدِ کالا
 * به‌جای دانه، دانه‌ی کالای دیگر، اسکنِ تکراری، و بیشتر از تعداد.
 *
 * مقدار همان payloadِ رقمیِ نرمال‌شده است — همان چیزی که سرور مقایسه می‌کند.
 */
export default function UnitBarcodeScanList({
  productId,
  barcodes = [],
  max,
  required = false,
  onChange,
}) {
  const handleScan = (code) => {
    const parsed = parseBarcode(code);
    if (parsed.kind !== BarcodeReferenceKindEnum.UNIT) {
      toast.error("این بارکدِ یک دانه نیست؛ برچسبِ روی خودِ کالا را اسکن کنید");
      return;
    }
    if (productId != null && parsed.productId !== productId) {
      toast.error("این دانه متعلق به کالای دیگری است");
      return;
    }
    if (barcodes.includes(parsed.normalizedPayload)) {
      toast.error("این دانه قبلاً اسکن شده است");
      return;
    }
    if (max != null && barcodes.length >= max) {
      toast.error(`برای این ردیف فقط ${fa(max)} دانه لازم است`);
      return;
    }
    onChange([...barcodes, parsed.normalizedPayload]);
  };

  const count = barcodes.length;
  const isComplete = max != null && count === max;
  const isPartial = count > 0 && !isComplete;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">
          اسکن دانه‌ها {required ? "(الزامی برای این کالا)" : "(اختیاری)"}
        </span>
        <span
          className={`tabular-nums font-medium ${
            isComplete
              ? "text-[oklch(0.50_0.16_152)]"
              : isPartial || required
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground"
          }`}
        >
          {fa(count)} از {fa(max)}
        </span>
      </div>
      <BarcodeScanField
        onScan={handleScan}
        placeholder="بارکد دانه را اسکن کنید..."
        inputClassName="h-8 text-xs"
      />
      {count > 0 && (
        <div className="flex flex-wrap gap-1">
          {barcodes.map((barcode) => (
            <Badge
              key={barcode}
              variant="outline"
              className="gap-1 font-mono text-[10px]"
              dir="ltr"
            >
              {barcode}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange(barcodes.filter((b) => b !== barcode))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {isPartial && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          یا همه‌ی دانه‌های این ردیف را اسکن کنید، یا هیچ‌کدام
          {required ? "" : " (تا سرور خودش انتخاب کند)"}.
        </p>
      )}
    </div>
  );
}
