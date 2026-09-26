import { Fragment } from "react";
import { Lock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { TaxCategoryEnum } from "@/shared/domain/enums/taxCategory";
import { invoiceLineAmounts } from "@/shared/domain/invoice/lineMath";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

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
 * @param description متنِ زیرِ عنوان؛ پیش‌فرض یادآوریِ «فقط در پیش‌فاکتور».
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
  description = "اقلام فقط در مرحله‌ی پیش‌فاکتور قابل ویرایش‌اند.",
  headerAction = null,
  renderDetails,
  totalAmount,
  footer = null,
}) {
  const lineSum = items.reduce((sum, item) => sum + amountsOf(item).totalAmount, 0);
  const taxSum = items.reduce((sum, item) => sum + amountsOf(item).taxAmount, 0);
  const total = totalAmount != null ? Number(totalAmount) || 0 : lineSum;

  return (
    <Card className="@container/items">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
            {title}
            <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </CardTitle>
          {headerAction}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">قلمی ثبت نشده است.</p>
        ) : (
          <>
            {/* عرضِ کم: کارت برای هر قلم */}
            <ul className="space-y-2 @3xl/items:hidden">
              {items.map((item) => (
                <li
                  key={item.id ?? item.productId}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">
                      {item.productName}
                      <LineBadges item={item} />
                    </p>
                    {item.productCode && (
                      <p className="font-mono text-xs text-muted-foreground">{item.productCode}</p>
                    )}
                  </div>
                  {renderDetails?.(item)}
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">تعداد</dt>
                    <dd className="text-left tabular-nums">{fa(item.quantity)}</dd>
                    {columns.map((column) => (
                      <Fragment key={column.key}>
                        <dt className="text-muted-foreground">{column.label}</dt>
                        <dd className="text-left tabular-nums">{column.render(item)}</dd>
                      </Fragment>
                    ))}
                    <dt className="text-muted-foreground">قیمت واحد</dt>
                    <dd className="text-left tabular-nums">{fa(item.unitPrice)}</dd>
                    {Number(item.discount) > 0 && (
                      <>
                        <dt className="text-muted-foreground">تخفیف</dt>
                        <dd className="text-left tabular-nums">{fa(item.discount)}٪</dd>
                      </>
                    )}
                    {amountsOf(item).taxAmount > 0 && (
                      <>
                        <dt className="text-muted-foreground">
                          مالیات {fa(item.taxPercent)}٪
                        </dt>
                        <dd className="text-left tabular-nums">{fa(amountsOf(item).taxAmount)}</dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">جمع</dt>
                    <dd className="text-left tabular-nums font-medium">
                      {fa(amountsOf(item).totalAmount)}
                    </dd>
                  </dl>
                  {renderActions && (
                    <div className="flex flex-wrap justify-end gap-2 empty:hidden">
                      {renderActions(item)}
                    </div>
                  )}
                </li>
              ))}
            </ul>

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
                      <td className="px-2 py-2 text-center tabular-nums">{fa(item.quantity)}</td>
                      {columns.map((column) => (
                        <td key={column.key} className="px-2 py-2 text-center tabular-nums">
                          {column.render(item)}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center tabular-nums">{fa(item.unitPrice)}</td>
                      <td className="px-2 py-2 text-center tabular-nums">
                        {Number(item.discount) > 0 ? `${fa(item.discount)}٪` : "—"}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">
                        {amountsOf(item).taxAmount > 0 ? fa(amountsOf(item).taxAmount) : "—"}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">
                        {fa(amountsOf(item).totalAmount)}
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
              <span className="tabular-nums">{fa(taxSum)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">جمع فاکتور</span>
            <span className="font-semibold tabular-nums">{fa(total)} ریال</span>
          </div>
        </div>

        {footer}
      </CardContent>
    </Card>
  );
}
