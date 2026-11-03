import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Loader2, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import SectionCard from "@/shared/components/forms/SectionCard";
import BarcodeScanField from "@/shared/components/barcode/BarcodeScanField";
import Notice from "@/shared/components/feedback/Notice";
import { formatNumber } from "@/shared/lib/numberFormat";
import { useRemoveStocktakeScanMutation, useScanStocktakeMutation } from "../services/mutations";
import { stocktakeKeys } from "../services/queryKeys";
import { scanOutcome, scanOutcomeMessage } from "../domain/stocktake";

/** چند اسکنِ آخرِ همین صفحه، برای برداشتنِ اسکنِ اشتباه. */
const RECENT_LIMIT = 8;

/**
 * اسکنِ دانه‌ها در شمارش (`ScanStocktakeUnits`). اسکنرِ دستی کد را با Enter می‌فرستد. هر بار فقط یک درخواست در
 * راه است: اسکن‌هایی که در این فاصله می‌رسند در صف می‌مانند و با درخواستِ بعدی یک‌جا می‌روند (سرور فهرست می‌گیرد)،
 * تا اسکنِ پشتِ‌سرهم روی سرورِ کند درخواست‌ها را روی هم انبار نکند. نتیجه (ثبت/تکراری/ناشناخته) از مقایسه‌ی سند پیش
 * و پس می‌آید. اسکنِ دانه‌ی کالای بیرون از دامنه آن کالا را با
 * موجودیِ سیستمِ صفر اضافه می‌کند (قاعده‌ی سرور).
 *
 * سرور بارکدهای اسکن‌شده‌ی هر ردیف را نمی‌فرستد، پس «برداشتن» فقط برای اسکن‌های همین نشست و بارکدهای ناشناخته
 * است. TODO(بکند): `scannedBarcodes` روی ردیف (`frontend-requests.fa.md` بخش ۳۴).
 */
export default function StocktakeScanPanel({ stocktake }) {
  const scan = useScanStocktakeMutation();
  const remove = useRemoveStocktakeScanMutation();
  const [recent, setRecent] = useState([]);

  const queryClient = useQueryClient();
  const queue = useRef([]);
  const busy = useRef(false);
  const [queued, setQueued] = useState(0);

  // سندِ تازه از کش، نه از prop: درخواستِ صف‌شده پس از پاسخِ قبلی فرستاده می‌شود.
  const latest = () => queryClient.getQueryData(stocktakeKeys.detail(stocktake.id)) ?? stocktake;

  const send = (codes) => {
    busy.current = true;
    const before = latest();
    scan.mutate(
      { stocktakeId: stocktake.id, barcodes: codes },
      {
        onSuccess: (after) => {
          const outcome = scanOutcome(before, after, codes);
          const message = scanOutcomeMessage(outcome);
          (message.tone === "success" ? toast.success : toast.error)(message.text);
          const unknown = new Set(after?.unknownBarcodes ?? []);
          const counted = codes.filter((code) => !unknown.has(code));
          if (outcome.added && counted.length) {
            setRecent((list) => [...new Set([...[...counted].reverse(), ...list])].slice(0, RECENT_LIMIT));
          }
        },
        onSettled: () => {
          const next = queue.current.splice(0);
          setQueued(0);
          if (next.length) send(next);
          else busy.current = false;
        },
      },
    );
  };

  const handleScan = (code) => {
    if (!busy.current) return send([code]);
    queue.current.push(code);
    setQueued(queue.current.length);
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
      {(scan.isPending || queued > 0) && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
          <Loader2 className="size-3.5 animate-spin" />
          در حال ثبت{queued > 0 ? `؛ ${formatNumber(queued)} اسکن در صف` : "..."}
        </p>
      )}
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
