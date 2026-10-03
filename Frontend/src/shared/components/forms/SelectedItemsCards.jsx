import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { PriceInput } from "@/shared/components/ui/price-input";
import { invoiceLineAmounts } from "@/shared/domain/invoice/lineMath";
import { formatNumber } from "@/shared/lib/numberFormat";
import ScannedUnitCodes from "./ScannedUnitCodes";

/** تعداد با دکمه‌های +/− — روی موبایل تایپِ عدد کُند است. */
function QuantityField({ value, onChange }) {
  const current = Number(value) || 0;
  return (
    <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-input bg-background">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-full w-9 shrink-0 rounded-none"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
        aria-label="یکی کمتر"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="تعداد"
        className="h-full min-w-0 flex-1 rounded-none border-0 border-x border-input px-1 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-full w-9 shrink-0 rounded-none"
        onClick={() => onChange(current + 1)}
        aria-label="یکی بیشتر"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/**
 * اقلامِ انتخاب‌شده در عرضِ کم — هر قلم یک کارت. قرینه‌ی `SelectedItemsTable`
 * که در عرضِ کافیِ همان ظرف (`@container/picker`) جایش را می‌گیرد.
 *
 * چیدمان: سرِ کارت نام و کد و حذف؛ وسط تعداد (با +/−)، قیمتِ واحد و تخفیف
 * که در عرضِ خیلی کم دو ردیف می‌شوند؛ پایین جمعِ قلم با جزئیاتِ تخفیف و
 * مالیات.
 */
export default function SelectedItemsCards({
  items,
  onFieldChange,
  onRemove,
  onRemoveUnit,
  lineTotal,
  grandTotal,
  taxAmount = 0,
  taxUnknown = false,
  showFooter = true,
}) {
  return (
    <div className="space-y-2 @2xl/picker:hidden">
      <ol className="space-y-2">
        {items.map((item, index) => {
          const amounts = invoiceLineAmounts(item);
          const gross = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
          return (
            <li
              key={item.productId}
              className="rounded-lg border border-border bg-card shadow-xs"
            >
              <div className="flex items-start gap-2.5 p-3 pb-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium tabular-nums text-muted-foreground">
                  {formatNumber(index + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-card-foreground">
                    {item.productName}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    {item.productCode && <span className="font-mono">{item.productCode}</span>}
                    {item.unit && <span>واحد: {item.unit}</span>}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(item.productId)}
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`حذف ${item.productName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* عرضِ خیلی کم: تعداد و تخفیف یک ردیف، قیمت ردیفِ کامل؛ کمی پهن‌تر: سه ستون. */}
              <div className="grid grid-cols-[1fr_5.5rem] gap-2 px-3 @sm/picker:grid-cols-[8.5rem_1fr_5.5rem]">
                <label className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">تعداد</span>
                  <QuantityField
                    value={item.quantity}
                    onChange={(next) => onFieldChange(item.productId, "quantity", next)}
                  />
                </label>
                <label className="order-last col-span-2 space-y-1 @sm/picker:order-none @sm/picker:col-span-1">
                  <span className="text-[11px] text-muted-foreground">قیمت واحد (ریال)</span>
                  <PriceInput
                    min={0}
                    value={item.unitPrice === "" || item.unitPrice == null ? null : Number(item.unitPrice)}
                    onValueChange={(next) => onFieldChange(item.productId, "unitPrice", next ?? "")}
                    className="h-9 w-full text-center text-sm tabular-nums"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">تخفیف ٪</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={item.discount}
                    onChange={(e) => onFieldChange(item.productId, "discount", e.target.value)}
                    className="h-9 w-full text-center text-sm tabular-nums"
                  />
                </label>
              </div>

              {item.productUnitBarcodes?.length > 0 && (
                <div className="px-3 pt-2">
                  <ScannedUnitCodes
                    codes={item.productUnitBarcodes}
                    quantity={item.quantity}
                    onRemove={onRemoveUnit && ((code) => onRemoveUnit(item.productId, code))}
                    className="rounded-md bg-muted/40 p-2"
                  />
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-1 rounded-b-lg border-t border-border bg-muted/30 px-3 py-2">
                <div className="space-y-0.5 text-[11px] text-muted-foreground tabular-nums">
                  {Number(item.discount) > 0 && (
                    <p>
                      {formatNumber(gross)} − تخفیف {formatNumber(item.discount)}٪
                    </p>
                  )}
                  {amounts.taxAmount > 0 && (
                    <p>
                      + مالیات {formatNumber(item.taxPercent)}٪: {formatNumber(amounts.taxAmount)}
                    </p>
                  )}
                </div>
                <p className="text-sm">
                  <span className="text-xs text-muted-foreground">جمع: </span>
                  <span className="font-bold tabular-nums text-card-foreground">
                    {formatNumber(lineTotal(item))}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {showFooter && (
      <div className="space-y-1 rounded-lg border border-border bg-muted px-3 py-2.5">
        {taxAmount > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>مالیات (در جمع اقلام آمده):</span>
            <span className="tabular-nums">{formatNumber(taxAmount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            جمع کل {formatNumber(items.length)} قلم:
          </span>
          <span className="text-sm font-bold tabular-nums text-card-foreground">
            {formatNumber(grandTotal)}
          </span>
        </div>
        {taxUnknown && (
          <p className="text-xs text-muted-foreground">
            مالیاتِ کالاهای تازه‌انتخاب‌شده را سرور هنگام ذخیره حساب و به جمع اضافه می‌کند.
          </p>
        )}
      </div>
      )}
    </div>
  );
}
