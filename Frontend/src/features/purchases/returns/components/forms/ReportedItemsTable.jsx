import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { PURCHASE_RETURN_REASON_LABELS } from "../../services/mockData";

export default function ReportedItemsTable({ purchaseReturn }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          اقلام گزارش‌شده
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          این اطلاعات از گزارش انبار در لحظه‌ی ثبت این مرجوعی گرفته شده.
          تصمیم‌گیری و تسویه‌ی هر قلم در بخش «پیگیری و هماهنگی» انجام
          می‌شود.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* نسخه دسکتاپ: جدول */}
        <div className="hidden md:block border border-border rounded-lg overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="w-[34%] text-right px-3 py-2.5 font-medium">
                  کالا
                </th>
                <th className="w-[12%] text-center px-2 py-2.5 font-medium">
                  تعداد
                </th>
                <th className="w-[16%] text-center px-2 py-2.5 font-medium">
                  قیمت واحد
                </th>
                <th className="w-[22%] text-center px-2 py-2.5 font-medium">
                  نوع مشکل گزارش‌شده
                </th>
                <th className="w-[16%] text-center px-2 py-2.5 font-medium">
                  جمع
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchaseReturn.items.map((item) => (
                <tr
                  key={item.issueId}
                  className="hover:bg-accent/30 transition-colors"
                >
                  <td className="px-3 py-2 truncate">
                    <p className="font-medium text-card-foreground text-sm truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.productCode}
                    </p>
                    {item.note && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.note}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    {item.qty.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    {item.unitPrice.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Badge
                      variant="outline"
                      className="text-[11px] whitespace-normal w-full h-full"
                    >
                      {PURCHASE_RETURN_REASON_LABELS[item.reason] ??
                        item.reason}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums font-medium text-card-foreground">
                    {item.lineTotal.toLocaleString("fa-IR")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted border-t border-border">
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-2.5 text-sm font-medium text-muted-foreground text-right"
                >
                  جمع کل:
                </td>
                <td className="px-2 py-2.5 text-center text-sm font-bold text-card-foreground">
                  {purchaseReturn.totalAmount.toLocaleString("fa-IR")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* نسخه موبایل: کارت */}
        <div className="md:hidden space-y-2">
          {purchaseReturn.items.map((item) => (
            <div
              key={item.issueId}
              className="border border-border rounded-lg p-3 space-y-2 bg-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-card-foreground text-sm truncate">
                    {item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.productCode}
                  </p>
                </div>
                <Badge variant="outline" className="text-[11px] shrink-0">
                  {PURCHASE_RETURN_REASON_LABELS[item.reason] ??
                    item.reason}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
                <span>
                  تعداد: {item.qty.toLocaleString("fa-IR")} ×{" "}
                  {item.unitPrice.toLocaleString("fa-IR")}
                </span>
                <span className="font-bold text-card-foreground">
                  {item.lineTotal.toLocaleString("fa-IR")}
                </span>
              </div>
              {item.note && (
                <p className="text-xs text-muted-foreground">
                  {item.note}
                </p>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 border border-border">
            <span className="text-sm font-medium text-muted-foreground">
              جمع کل:
            </span>
            <span className="text-sm font-bold text-card-foreground">
              {purchaseReturn.totalAmount.toLocaleString("fa-IR")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
