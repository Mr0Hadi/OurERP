import { Fragment } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { PriceInput } from "@/shared/components/ui/price-input";
import { invoiceLineAmounts } from "@/shared/domain/invoice/lineMath";
import { formatNumber } from "@/shared/lib/numberFormat";
import ScannedUnitCodes from "./ScannedUnitCodes";

/** تعداد با +/− در یک خانه‌ی جمع‌وجور. */
function QuantityCell({ value, onChange }) {
  const current = Number(value) || 0;
  return (
    <div className="flex h-8 items-stretch overflow-hidden rounded-md border border-input bg-background">
      <Button
        type="button"
        variant="ghost"
        className="h-full w-7 shrink-0 rounded-none p-0"
        onClick={() => onChange(current + 1)}
        aria-label="یکی بیشتر"
      >
        <Plus className="size-3.5" />
      </Button>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="تعداد"
        className="h-full min-w-0 flex-1 rounded-none border-0 border-x border-input px-0.5 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
      />
      <Button
        type="button"
        variant="ghost"
        className="h-full w-7 shrink-0 rounded-none p-0"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
        aria-label="یکی کمتر"
      >
        <Minus className="size-3.5" />
      </Button>
    </div>
  );
}

/**
 * اقلامِ انتخاب‌شده به‌شکلِ جدول، وقتی ظرفِ انتخابگر (`@container/picker`) جا
 * دارد (از ۴۲rem)؛ در عرضِ کمتر `SelectedItemsCards` جایش را می‌گیرد. ستون‌ها
 * راست‌چین‌اند و نامِ کالا جای اصلی را می‌گیرد؛ کد، واحد و مالیات زیرِ نام و جمع.
 */
export default function SelectedItemsTable({
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
    <div className="hidden overflow-hidden rounded-lg border border-border @2xl/picker:block">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr className="text-right">
            <th className="w-8 px-2 py-2 font-medium">#</th>
            <th className="px-2 py-2 font-medium">کالا</th>
            <th className="w-28 px-2 py-2 font-medium">تعداد</th>
            <th className="w-36 px-2 py-2 font-medium">قیمت واحد</th>
            <th className="w-16 px-2 py-2 font-medium">تخفیف٪</th>
            <th className="w-28 px-2 py-2 font-medium">جمع</th>
            <th className="w-9" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item, index) => {
            const amounts = invoiceLineAmounts(item);
            const hasUnits = item.productUnitBarcodes?.length > 0;
            return (
              <Fragment key={item.productId}>
                <tr className="align-top text-right hover:bg-muted/30">
                  <td className="px-2 py-2.5 text-xs text-muted-foreground tabular-nums">
                    {formatNumber(index + 1)}
                  </td>
                  <td className="px-2 py-2">
                    <p className="line-clamp-2 font-medium leading-5 text-card-foreground" title={item.productName}>
                      {item.productName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.productCode && <span dir="ltr">{item.productCode}</span>}
                      {item.unit && ` · ${item.unit}`}
                    </p>
                  </td>
                  <td className="px-2 py-2">
                    <QuantityCell
                      value={item.quantity}
                      onChange={(next) => onFieldChange(item.productId, "quantity", next)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <PriceInput
                      min={0}
                      value={item.unitPrice === "" || item.unitPrice == null ? null : Number(item.unitPrice)}
                      onValueChange={(next) => onFieldChange(item.productId, "unitPrice", next ?? "")}
                      aria-label="قیمت واحد"
                      className="h-8 w-full text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discount}
                      onChange={(e) => onFieldChange(item.productId, "discount", e.target.value)}
                      aria-label="تخفیف درصد"
                      className="h-8 w-full text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <p className="pt-1.5 font-semibold tabular-nums text-card-foreground">
                      {formatNumber(lineTotal(item))}
                    </p>
                    {amounts.taxAmount > 0 && (
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        مالیات {formatNumber(amounts.taxAmount)}
                      </p>
                    )}
                  </td>
                  <td className="px-1 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onRemove(item.productId)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`حذف ${item.productName}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
                {/* دانه‌ها زیرِ همان ردیف و به پهنای کلِ جدول. */}
                {hasUnits && (
                  <tr>
                    <td colSpan={7} className="px-3 pb-2.5 pt-0">
                      <ScannedUnitCodes
                        codes={item.productUnitBarcodes}
                        quantity={item.quantity}
                        onRemove={onRemoveUnit && ((code) => onRemoveUnit(item.productId, code))}
                        className="rounded-md bg-muted/40 p-2"
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        {showFooter && (
          <tfoot className="border-t border-border bg-muted/60 text-right">
            {taxAmount > 0 && (
              <tr className="text-xs text-muted-foreground">
                <td colSpan={5} className="px-3 pt-2.5">مالیات (در جمع اقلام آمده)</td>
                <td className="px-2 pt-2.5 tabular-nums">{formatNumber(taxAmount)}</td>
                <td />
              </tr>
            )}
            <tr>
              <td colSpan={5} className="px-3 py-2.5 font-medium text-muted-foreground">جمع کل اقلام</td>
              <td className="px-2 py-2.5 font-bold tabular-nums">{formatNumber(grandTotal)}</td>
              <td />
            </tr>
            {taxUnknown && (
              <tr>
                <td colSpan={7} className="px-3 pb-2.5 text-xs text-muted-foreground">
                  مالیاتِ کالاهای تازه‌انتخاب‌شده را سرور هنگام ذخیره حساب و به جمع اضافه می‌کند.
                </td>
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  );
}
