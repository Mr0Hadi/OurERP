import { Lock, Package } from "lucide-react";
import SectionCard from "@/shared/components/documents/SectionCard";
import { Badge } from "@/shared/components/ui/badge";
import { TaxCategoryEnum } from "@/shared/domain/enums/taxCategory";
import { invoiceLineAmounts } from "@/shared/domain/invoice/lineMath";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";

/**
 * مبالغِ ذخیره‌شده‌ی سرور روی هر قلم (`taxAmount`، `totalAmount`)؛ فاکتورِ
 * صادرشده ثابت است و اینجا چیزی حساب نمی‌شود. پاسخی که آن‌ها را ندارد
 * (بکندِ قدیمی‌تر) با همان قاعده‌ی سرور پیش‌نمایش می‌شود.
 */
const amountsOf = (item) =>
  item.totalAmount != null
    ? { taxAmount: Number(item.taxAmount) || 0, totalAmount: Number(item.totalAmount) || 0 }
    : invoiceLineAmounts(item);

/** برچسب‌های کنارِ نامِ کالا: قلمِ ضمیمه (پذیرشِ مازاد) و کالای معاف. */
function LineBadges({ item }) {
  const exempt = Number(item.taxCategory) === TaxCategoryEnum.EXEMPT;
  if (!item.isSupplement && !exempt) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle ms-1">
      {item.isSupplement && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          ضمیمه
        </Badge>
      )}
      {exempt && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          معاف از مالیات
        </Badge>
      )}
    </span>
  );
}

/**
 * اقلامِ یک سندِ خرید/فروش که از پیش‌فاکتور بیرون آمده — فقط‌خواندنی.
 *
 * اقلام فقط در پیش‌فاکتور تغییر می‌کنند؛ بعد از آن فاکتورِ رسمی صادر شده و
 * انبار روی همین اقلام کار می‌کند. تغییرِ بعدی از مسیرهای خودش است (بستنِ
 * قلم، خریدِ مازاد، مرجوعی).
 *
 * چیدمان به عرضِ همین کارت واکنش نشان می‌دهد (container query): در عرضِ
 * کم هر قلم یک کارت است و در عرضِ کافی یک جدول.
 *
 * @param columns اختیاری — ستون‌های اضافه بعد از «تعداد»، هر کدام
 *   `{ key, label, render(item) }` (مثلاً «ارسال‌شده» در فروش، «رسیده» و
 *   «مانده» در خرید). `render` می‌تواند متن یا یک المان برگرداند.
 * @param renderActions اختیاری — `(item) => node` برای دکمه‌های هر قلم.
 * @param description متنِ کوتاهِ زیرِ عنوان (اختیاری). قفلِ کنارِ عنوان یعنی
 *   اقلام فقط در پیش‌فاکتور ویرایش می‌شوند.
 * @param headerAction اختیاری — دکمه/پیوندی کنارِ عنوان (مثلاً «دانه‌ها و برچسب‌ها»).
 * @param renderDetails اختیاری — `(item) => node` زیرِ نامِ هر قلم (مثلاً
 *   گزارشِ انبار از دریافت).
 * @param totalAmount جمعِ ذخیره‌شده‌ی سند؛ اگر نیامد، جمعِ اقلام.
 * @param footer اختیاری — محتوای پایینِ کارت، بعد از جمع.
 */
export default function OrderItemsReadOnly({
  title,
  items = [],
  columns = [],
  renderActions,
  description,
  headerAction = null,
  renderDetails,
  totalAmount,
  footer = null,
}) {
  const lineSum = items.reduce((sum, item) => sum + amountsOf(item).totalAmount, 0);
  const taxSum = items.reduce((sum, item) => sum + amountsOf(item).taxAmount, 0);
  const total = totalAmount != null ? Number(totalAmount) || 0 : lineSum;

  return (
    <SectionCard
      icon={Package}
      title={
        <span className="inline-flex items-center gap-1.5">
          {title}
          <Lock className="size-3 text-muted-foreground" aria-label="قفل" />
        </span>
      }
      description={description}
      action={headerAction}
      className="@container/items"
      contentClassName="space-y-3"
    >
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">قلمی ثبت نشده است.</p>
        ) : (
          <>
            {/* عرضِ کم: کارت برای هر قلم — نام و جمع بالا، شمارنده‌ها به‌شکلِ
                کاشی، و قیمت به‌شکلِ یک خطِ محاسبه. */}
            <ol className="space-y-2 @3xl/items:hidden">
              {items.map((item, index) => {
                const amounts = amountsOf(item);
                return (
                  <li
                    key={item.id ?? item.productId}
                    className="rounded-lg border border-border bg-card pb-3 shadow-xs"
                  >
                    <div className="flex items-start gap-2.5 p-3 pb-2">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium tabular-nums text-muted-foreground">
                        {formatNumber(index + 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug break-words">
                          {item.productName}
                          <LineBadges item={item} />
                        </p>
                        {item.productCode && (
                          <p className="font-mono text-xs text-muted-foreground">{item.productCode}</p>
                        )}
                      </div>
                      <p className="shrink-0 text-left">
                        <span className="block text-[10px] text-muted-foreground">جمع</span>
                        <span className="text-sm font-bold tabular-nums">
                          {formatNumber(amounts.totalAmount)}
                        </span>
                      </p>
                    </div>

                    <dl className="grid grid-cols-3 gap-1.5 px-3">
                      {[
                        { key: "quantity", label: "تعداد", render: (line) => formatNumber(line.quantity) },
                        ...columns,
                      ].map((column) => (
                        <div
                          key={column.key}
                          className="rounded-md bg-muted/50 px-2 py-1.5 text-center"
                        >
                          <dt className="text-[10px] text-muted-foreground">{column.label}</dt>
                          <dd className="text-sm font-medium tabular-nums">{column.render(item)}</dd>
                        </div>
                      ))}
                    </dl>

                    <p className="px-3 pt-2 text-[11px] text-muted-foreground tabular-nums">
                      {formatNumber(item.quantity)} × {formatNumber(item.unitPrice)}
                      {Number(item.discount) > 0 && ` − تخفیف ${formatNumber(item.discount)}٪`}
                      {amounts.taxAmount > 0 &&
                        ` + مالیات ${formatNumber(item.taxPercent)}٪ (${formatNumber(amounts.taxAmount)})`}
                    </p>

                    {renderDetails && <div className="px-3 pt-2 empty:hidden">{renderDetails(item)}</div>}

                    {renderActions && (
                      <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-border px-3 pt-2 empty:hidden">
                        {renderActions(item)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            {/* عرضِ کافی: جدول */}
            <div className="hidden @3xl/items:block border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-xs">
                  <tr>
                    <th className="text-right px-3 py-2.5 font-medium">کالا</th>
                    <th className="text-center px-2 py-2.5 font-medium">تعداد</th>
                    {columns.map((column) => (
                      <th key={column.key} className="text-center px-2 py-2.5 font-medium">
                        {column.label}
                      </th>
                    ))}
                    <th className="text-center px-2 py-2.5 font-medium">قیمت واحد</th>
                    <th className="text-center px-2 py-2.5 font-medium">تخفیف</th>
                    <th className="text-center px-2 py-2.5 font-medium">مالیات</th>
                    <th className="text-center px-2 py-2.5 font-medium">جمع</th>
                    {renderActions && <th className="w-px px-2 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id ?? item.productId}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-sm break-words">
                          {item.productName}
                          <LineBadges item={item} />
                        </p>
                        {item.productCode && (
                          <p className="font-mono text-xs text-muted-foreground">
                            {item.productCode}
                          </p>
                        )}
                        {renderDetails && <div className="mt-1">{renderDetails(item)}</div>}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">{formatNumber(item.quantity)}</td>
                      {columns.map((column) => (
                        <td key={column.key} className="px-2 py-2 text-center tabular-nums">
                          {column.render(item)}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center tabular-nums">{formatNumber(item.unitPrice)}</td>
                      <td className="px-2 py-2 text-center tabular-nums">
                        {Number(item.discount) > 0 ? `${formatNumber(item.discount)}٪` : "—"}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">
                        {amountsOf(item).taxAmount > 0 ? formatNumber(amountsOf(item).taxAmount) : "—"}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">
                        {formatNumber(amountsOf(item).totalAmount)}
                      </td>
                      {renderActions && (
                        <td className="px-2 py-2 whitespace-nowrap">{renderActions(item)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="space-y-1 border-t border-border pt-3 text-sm">
          {taxSum > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>جمع مالیات</span>
              <span className="tabular-nums">{formatNumber(taxSum)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">جمع فاکتور</span>
            <span className="font-semibold tabular-nums">{formatRial(total)}</span>
          </div>
        </div>

        {footer}
    </SectionCard>
  );
}
