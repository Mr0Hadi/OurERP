import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

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
export default function SaleInvoiceCard({ sale, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const items = sale?.items || [];
  const total = items.reduce(
    (sum, item) => sum + (Number(item.lineTotal) || 0),
    0,
  );

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
              {sale.customerName} · {gregorianToPersian(sale.invoiceDate)} ·{" "}
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
                    تعداد فاکتور
                  </th>
                  <th className="py-2 px-2 text-center font-medium">
                    تحویل‌شده
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
                    key={item.productId}
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
                      {fa(item.qty)} {item.unit}
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums">
                      <DeliveredCell item={item} />
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums">
                      {fa(item.unitPrice)}
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums font-medium">
                      {fa(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={4} className="py-2 px-2 text-right font-medium">
                    جمع کل فاکتور
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
                key={item.productId}
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
                  <Row label="تعداد فاکتور">
                    {fa(item.qty)} {item.unit}
                  </Row>
                  <Row label="تحویل‌شده">
                    <DeliveredCell item={item} />
                  </Row>
                  <Row label="قیمت واحد">{fa(item.unitPrice)}</Row>
                  <Row label="جمع خط">
                    <span className="font-medium text-card-foreground">
                      {fa(item.lineTotal)}
                    </span>
                  </Row>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
              <span className="text-muted-foreground">جمع کل فاکتور</span>
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

function DeliveredCell({ item }) {
  const delivered = item.deliveredQty ?? item.qty;
  const isShort = delivered < item.qty;
  return (
    <>
      <span className={isShort ? "text-amber-600 dark:text-amber-400" : ""}>
        {fa(delivered)} {item.unit}
      </span>
      {item.activeClaimedQty > 0 && (
        <span className="block text-[10px] text-muted-foreground">
          {fa(item.activeClaimedQty)} در مرجوعی دیگر
        </span>
      )}
    </>
  );
}
