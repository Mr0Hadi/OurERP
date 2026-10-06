import { useState } from "react";
import { FileText, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * انتخابِ سندِ مبدا (خرید یا فروش) در صفحه‌ی ثبتِ مرجوعی — مشترکِ دو سمت.
 *
 * جست‌وجو با شماره‌ی فاکتور و با تأخیر به سرور می‌رود؛ فهرست فقط سندهایی است
 * که مرجوعی می‌پذیرند (`RETURNABLE_*_STATUSES`).
 *
 * @param useReturnableQuery هوکِ کوئریِ همان سمت: `(search) => { data, isLoading, isFetching }`
 * @param partyKey          نامِ فیلدِ طرف‌حساب روی ردیف (`supplierName`/`customerName`)
 * @param statusLabels      برچسبِ وضعیتِ سند
 */
export default function ReturnSourcePicker({
  title,
  hint,
  useReturnableQuery,
  partyKey,
  statusLabels,
  emptyText,
  onSelect,
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const { data: documents = [], isLoading, isFetching } = useReturnableQuery(debouncedSearch);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">{title}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          {/* هرگز در حینِ بارگذاری غیرفعال نمی‌شود: قبلاً با هر حرف کوئری تازه
              می‌شد، فیلد غیرفعال می‌شد و فوکوس می‌پرید. */}
          <Input
            placeholder="جست‌وجو با شماره فاکتور..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-rtl-placeholder pr-9 h-9"
          />
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-6">در حال جست‌وجو...</p>
        ) : documents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            {debouncedSearch ? "با این شماره فاکتوری پیدا نشد" : emptyText}
          </p>
        ) : (
          <ul
            className={`max-h-72 overflow-y-auto custom-scroll rounded-lg border border-border divide-y divide-border bg-card transition-opacity ${
              isFetching ? "opacity-60" : ""
            }`}
          >
            {documents.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onSelect(doc.id)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-right hover:bg-accent/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">
                      {doc.invoiceNumber || "بی‌شماره"} — {doc[partyKey]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {gregorianToPersian(doc.invoiceDate)} · {statusLabels[doc.status] ?? "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-card-foreground">
                    {formatRial(doc.totalAmount)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
