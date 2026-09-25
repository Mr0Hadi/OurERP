import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { TaxCategoryEnum } from "@/shared/domain/enums/taxCategory";
import { invoiceLineAmounts } from "@/shared/domain/invoice/lineMath";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * اقلامِ فاکتورِ صادرشده، فقط‌خواندنی و با **مبالغِ ذخیره‌شده‌ی سرور**
 * (`grossAmount`، `discountAmount`، `taxAmount`، `totalAmount` هر قلم).
 * فاکتور صادرشده ثابت است؛ اینجا چیزی حساب نمی‌شود.
 *
 * قلمِ ضمیمه (`isSupplement`، از پذیرشِ کالای مازاد) با برچسب نشان داده
 * می‌شود.
 */
/**
 * مبالغِ ذخیره‌شده‌ی سرور؛ اگر پاسخ آن‌ها را ندارد (بکندِ قدیمی‌تر)، با
 * همان قاعده‌ی سرور از تعداد، قیمت و تخفیف حساب می‌شوند.
 */
function withAmounts(item) {
  if (item.totalAmount != null) return item;
  return { ...item, ...invoiceLineAmounts(item) };
}

export default function InvoiceLinesCard({
  title,
  items: rawItems = [],
  totalAmount,
}) {
  const items = rawItems.map(withAmounts);
  const taxTotal = items.reduce(
    (sum, item) => sum + (Number(item.taxAmount) || 0),
    0,
  );
  const discountTotal = items.reduce(
    (sum, item) => sum + (Number(item.discountAmount) || 0),
    0,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <li key={item.id} className="px-3 py-2.5 text-sm space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-card-foreground truncate">
                    {item.productName || `کالای #${item.productId}`}
                  </p>
                  {item.productCode && (
                    <p className="text-xs text-muted-foreground">
                      {item.productCode}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {item.isSupplement && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      ضمیمه
                    </Badge>
                  )}
                  {Number(item.taxCategory) === TaxCategoryEnum.EXEMPT && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      معاف از مالیات
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {fa(item.quantity)} × {fa(item.unitPrice)}
                  {Number(item.discount) > 0 && ` − ${fa(item.discount)}٪`}
                </span>
                {Number(item.taxAmount) > 0 && (
                  <span>
                    مالیات {fa(item.taxPercent)}٪: {fa(item.taxAmount)}
                  </span>
                )}
                <span className="font-semibold text-card-foreground">
                  {fa(item.totalAmount)} ریال
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="rounded-lg bg-muted px-3 py-2.5 border border-border space-y-1 text-sm">
          {discountTotal > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>جمع تخفیف</span>
              <span>{fa(discountTotal)}</span>
            </div>
          )}
          {taxTotal > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>جمع مالیات</span>
              <span>{fa(taxTotal)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span className="text-muted-foreground">جمع فاکتور</span>
            <span>{fa(totalAmount)} ریال</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
