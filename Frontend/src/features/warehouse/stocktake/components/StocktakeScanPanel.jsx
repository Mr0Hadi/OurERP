import { useState } from "react";
import { toast } from "react-hot-toast";
import { Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import SectionCard from "@/shared/components/forms/SectionCard";
import BarcodeScanField from "@/shared/components/barcode/BarcodeScanField";
import Notice from "@/shared/components/feedback/Notice";
import { useRemoveStocktakeScanMutation, useScanStocktakeMutation } from "../services/mutations";
import { scanOutcome, scanOutcomeMessage } from "../domain/stocktake";

/** چند اسکنِ آخرِ همین صفحه، برای برداشتنِ اسکنِ اشتباه. */
const RECENT_LIMIT = 8;

/**
 * اسکنِ دانه‌ها در شمارش (`ScanStocktakeUnits`). اسکنرِ دستی کد را با Enter می‌فرستد؛ هر اسکن جدا ثبت می‌شود و
 * نتیجه (ثبت/تکراری/ناشناخته) از مقایسه‌ی سند پیش و پس می‌آید. اسکنِ دانه‌ی کالای بیرون از دامنه آن کالا را با
 * موجودیِ سیستمِ صفر اضافه می‌کند (قاعده‌ی سرور).
 *
 * سرور بارکدهای اسکن‌شده‌ی هر ردیف را نمی‌فرستد، پس «برداشتن» فقط برای اسکن‌های همین نشست و بارکدهای ناشناخته
 * است. TODO(بکند): `scannedBarcodes` روی ردیف (`frontend-requests.fa.md` بخش ۳۴).
 */
export default function StocktakeScanPanel({ stocktake }) {
  const scan = useScanStocktakeMutation();
  const remove = useRemoveStocktakeScanMutation();
  const [recent, setRecent] = useState([]);

  const handleScan = (code) => {
    scan.mutate(
      { stocktakeId: stocktake.id, barcodes: [code] },
      {
        onSuccess: (after) => {
          const outcome = scanOutcome(stocktake, after, [code]);
          const message = scanOutcomeMessage(outcome);
          (message.tone === "success" ? toast.success : toast.error)(message.text);
          if (outcome.added) setRecent((list) => [code, ...list.filter((item) => item !== code)].slice(0, RECENT_LIMIT));
        },
      },
    );
  };

  const handleRemove = (barcode) =>
    remove.mutate(
      { stocktakeId: stocktake.id, barcode },
      { onSuccess: () => setRecent((list) => list.filter((item) => item !== barcode)) },
    );

  const unknown = stocktake.unknownBarcodes ?? [];

  return (
    <SectionCard title="اسکنِ دانه‌ها">
      <BarcodeScanField onScan={handleScan} placeholder="بارکدِ دانه را اسکن کنید..." />
      <p className="text-xs text-muted-foreground">
        هر دانه‌ی اسکن‌شده شمرده می‌شود؛ اسکنِ دوباره بی‌اثر است. برای کالای بی‌برچسب عدد را در جدولِ پایین بنویسید.
      </p>
      {recent.length > 0 && <BarcodeList title="اسکن‌های اخیر" barcodes={recent} onRemove={handleRemove} pending={remove.isPending} />}
      {unknown.length > 0 && (
        <Notice tone="warning">
          <BarcodeList
            title="بارکدهای ناشناخته (اثری ندارند)"
            barcodes={unknown}
            onRemove={handleRemove}
            pending={remove.isPending}
          />
        </Notice>
      )}
    </SectionCard>
  );
}

function BarcodeList({ title, barcodes, onRemove, pending }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {barcodes.map((barcode) => (
          <li key={barcode} className="flex items-center gap-1 rounded-md border border-border bg-background ps-2 text-xs">
            <span className="font-mono" dir="ltr">
              {barcode}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={pending}
              aria-label={`برداشتنِ اسکنِ ${barcode}`}
              title="برداشتنِ اسکن"
              onClick={() => onRemove(barcode)}
            >
              <Undo2 className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
