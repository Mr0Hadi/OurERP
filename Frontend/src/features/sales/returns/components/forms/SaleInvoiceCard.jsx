import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * جزئیات فروش، به شکل خودِ فاکتور.
 *
 * واحد فروش پیش از ثبت هر مشکلی باید همان چیزی را ببیند که مشتری در
 * دست دارد — کد کالا، تعداد فاکتورشده، تعداد واقعاً تحویل‌شده، قیمت و
 * جمع هر خط. تفاوت «تعداد فاکتور» و «تحویل‌شده» عمداً کنار هم است، چون
 * خودش یکی از پرتکرارترین ریشه‌های مرجوعی است.
 */
export default function SaleInvoiceCard({ sale }) {
  const items = sale?.items || [];
  const total = items.reduce(
    (sum, item) => sum + (Number(item.lineTotal) || 0),
    0,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            فاکتور فروش {sale.invoiceNumber}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>مشتری: {sale.customerName}</span>
            <span>·</span>
            <span>تاریخ: {gregorianToPersian(sale.invoiceDate)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 px-2 text-right font-medium">کالا</th>
                <th className="py-2 px-2 text-center font-medium">
                  تعداد فاکتور
                </th>
                <th className="py-2 px-2 text-center font-medium">تحویل‌شده</th>
                <th className="py-2 px-2 text-center font-medium">قیمت واحد</th>
                <th className="py-2 px-2 text-center font-medium">جمع خط</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const delivered = item.deliveredQty ?? item.qty;
                const isShort = delivered < item.qty;
                return (
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
                      <span
                        className={
                          isShort ? "text-amber-600 dark:text-amber-400" : ""
                        }
                      >
                        {fa(delivered)} {item.unit}
                      </span>
                      {item.activeClaimedQty > 0 && (
                        <Badge
                          variant="outline"
                          className="ms-1 text-[10px] bg-muted text-muted-foreground border-border"
                        >
                          {fa(item.activeClaimedQty)} در مرجوعی دیگر
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums">
                      {fa(item.unitPrice)}
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums font-medium">
                      {fa(item.lineTotal)}
                    </td>
                  </tr>
                );
              })}
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
      </CardContent>
    </Card>
  );
}
