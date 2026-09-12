import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { gregorianToPersian } from "@/shared/lib/dateUtils";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * دو سندِ پشتِ این کارت، دو شکلِ متفاوتِ بک‌اند دارند و هیچ‌کدام فیلدِ
 * «جمع خط» نمی‌دهد. نامِ هر دو سمت اینجا صریح خوانده می‌شود، نه اینکه
 * یک لایه‌ی ترجمه بالایشان ساخته شود:
 *
 *   خرید → `PurchaseReceivingItemInfoDto`: orderedQuantity / receivedQuantity
 *   فروش → `SaleItemDto`:                  quantity        / shippedQuantity
 */
const orderedOf = (item) => Number(item.orderedQuantity ?? item.quantity) || 0;
const deliveredOf = (item) =>
  Number(item.receivedQuantity ?? item.shippedQuantity) || 0;

// `Discount` روی `SaleItemDto` درصد است (سمتِ خرید اصلاً این فیلد را
// در پاسخِ دریافت نمی‌دهد، پس صفر می‌ماند).
const lineTotalOf = (item) =>
  (orderedOf(item) * (Number(item.unitPrice) || 0) *
    (100 - (Number(item.discount) || 0))) / 100;

/**
 * جزئیات فروش، به شکل خودِ فاکتور.
 *
 * واحد فروش پیش از ثبت هر مشکلی باید همان چیزی را ببیند که مشتری در
 * دست دارد. تفاوت «تعداد فاکتور» و «تحویل‌شده» عمداً کنار هم است، چون
 * خودش یکی از پرتکرارترین ریشه‌های مرجوعی است.
 *
 * defaultOpen=false برای صفحه‌ی جزئیات مرجوعی است، که کارِ اصلی‌اش
 * تصمیم‌گیری است و فاکتور فقط مرجع است — باز بودنش نصف صفحه را
 * می‌گرفت.
 */
export default function OrderInvoiceCard({
  order: sale,
  defaultOpen = true,
  quantityLabel = "تعداد فاکتور",
  deliveredLabel = "تحویل‌شده",
  partyName,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const items = sale?.items || [];
  const total = items.reduce((sum, item) => sum + lineTotalOf(item), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="w-full flex items-start justify-between gap-2 text-right"
        >
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="break-words">فاکتور {sale.invoiceNumber}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {partyName} · {gregorianToPersian(sale.invoiceDate)} ·{" "}
              <span className="tabular-nums">{fa(total)} ریال</span>
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform mt-1 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent>
          {/* دسکتاپ: جدول */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 px-2 text-right font-medium">کالا</th>
                  <th className="py-2 px-2 text-center font-medium">
                    {quantityLabel}
                  </th>
                  <th className="py-2 px-2 text-center font-medium">
                    {deliveredLabel}
                  </th>
                  <th className="py-2 px-2 text-center font-medium">
                    قیمت واحد
                  </th>
                  <th className="py-2 px-2 text-center font-medium">جمع خط</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.purchaseItemId ?? item.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2 px-2">
                      <div className="font-medium text-card-foreground">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.productCode}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums">
                      {fa(orderedOf(item))} {item.unit || "عدد"}
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums">
                      <DeliveredCell item={item} />
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums">
                      {fa(item.unitPrice)}
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums font-medium">
                      {fa(lineTotalOf(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={4} className="py-2 px-2 text-right font-medium">
                    جمع کل سند
                  </td>
                  <td className="py-2 px-2 text-center font-bold tabular-nums">
                    {fa(total)} ریال
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* موبایل: کارت به‌ازای هر قلم */}
          <div className="md:hidden space-y-2">
            {items.map((item) => (
              <div
                key={item.purchaseItemId ?? item.id}
                className="rounded-lg border border-border p-2.5 space-y-1.5"
              >
                <div>
                  <p className="text-sm font-medium text-card-foreground break-words">
                    {item.productName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.productCode}
                  </p>
                </div>
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <Row label={quantityLabel}>
                    {fa(orderedOf(item))} {item.unit || "عدد"}
                  </Row>
                  <Row label={deliveredLabel}>
                    <DeliveredCell item={item} />
                  </Row>
                  <Row label="قیمت واحد">{fa(item.unitPrice)}</Row>
                  <Row label="جمع خط">
                    <span className="font-medium text-card-foreground">
                      {fa(lineTotalOf(item))}
                    </span>
                  </Row>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
              <span className="text-muted-foreground">جمع کل سند</span>
              <span className="font-bold tabular-nums">{fa(total)} ریال</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-2 min-w-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="tabular-nums text-left min-w-0">{children}</span>
    </div>
  );
}

/**
 * «تحویل‌شده»، و در سمتِ فروش آنچه تا حالا از راهِ مرجوعی تسویه شده.
 *
 * ⚠️ اینجا قبلاً سه عدد نشان داده می‌شد — ادعای همین سند، ادعای
 * مرجوعی‌های دیگرِ همین سفارش، و باقیمانده‌ی بدون ادعا. هیچ‌کدام از آن
 * سه را بک‌اند نمی‌دهد: نه `PurchaseReceivingItemInfoDto` و نه
 * `SaleItemDto` چیزی درباره‌ی ادعاهای بازِ سایر مرجوعی‌ها برنمی‌گردانند،
 * و سقفِ واقعی فقط لحظه‌ی `POST Create*Return` سمتِ سرور چک می‌شود. پس
 * آن سه عدد همیشه صفر بودند و کادر را بی‌صدا خالی نشان می‌دادند.
 *
 * تنها چیزی که واقعاً در دست هست `settledQuantity` سمتِ فروش است.
 */
function DeliveredCell({ item }) {
  const ordered = orderedOf(item);
  const delivered = deliveredOf(item);
  const settled = Number(item.settledQuantity) || 0;
  const isShort = delivered < ordered;

  return (
    <>
      <span className={isShort ? "text-amber-600 dark:text-amber-400" : ""}>
        {fa(delivered)} {item.unit || "عدد"}
      </span>
      {settled > 0 && (
        <span className="block text-[10px] leading-4 mt-0.5 text-muted-foreground">
          {fa(settled)} تسویه‌شده در مرجوعی
        </span>
      )}
    </>
  );
}
