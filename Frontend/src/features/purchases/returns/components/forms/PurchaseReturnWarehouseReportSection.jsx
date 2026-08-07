// src/features/purchases/components/forms/PurchaseReturnWarehouseReportSection.jsx
import { ClipboardList, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  PURCHASE_ISSUE_TYPE_LABELS,
  PURCHASE_ISSUE_TYPE_STYLES,
} from "@/shared/constants/purchaseIssueTypes";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

// نمایش دقیق و بدون واسطه‌ی گزارشی که انباردار هنگام دریافت ثبت کرده.
// چون یک محصول ممکن است چند نوع مشکل مستقل داشته باشد (مثلاً هم کسری
// هم معیوب)، همان محصول می‌تواند چند بار با نوع/تعداد/یادداشت متفاوت
// در این جدول تکرار شود — این ردیف‌ها با issueId از هم متمایزند.
export default function PurchaseReturnWarehouseReportSection({ report }) {
  if (!report) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          گزارش انبار — {report.invoiceNumber}
        </CardTitle>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
          <span>تامین‌کننده: {report.supplierName}</span>
          {report.receivedDate && (
            <span>تاریخ دریافت: {gregorianToPersian(report.receivedDate)}</span>
          )}
          {report.transporterName && (
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3" />
              تحویل‌دهنده: {report.transporterName}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* نسخه دسکتاپ: جدول */}
        <div className="hidden md:block border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="text-right px-3 py-2.5 font-medium">کالا</th>
                <th className="text-center px-2 py-2.5 font-medium">سفارش‌شده</th>
                <th className="text-center px-2 py-2.5 font-medium">دریافت‌شده</th>
                <th className="text-center px-2 py-2.5 font-medium">کسری باز</th>
                <th className="text-center px-2 py-2.5 font-medium">نوع مشکل</th>
                <th className="text-right px-2 py-2.5 font-medium">یادداشت انبار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.items.map((item) => {
                const style =
                  PURCHASE_ISSUE_TYPE_STYLES[item.issueType] ??
                  PURCHASE_ISSUE_TYPE_STYLES.other;
                return (
                  <tr key={item.issueId}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-card-foreground text-sm">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.productCode}</p>
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {item.orderedQty.toLocaleString("fa-IR")}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {item.receivedQty.toLocaleString("fa-IR")}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                        {item.openShortageQty.toLocaleString("fa-IR")}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Badge variant="outline" className={`text-[11px] ${style}`}>
                        {PURCHASE_ISSUE_TYPE_LABELS[item.issueType] ?? item.issueType}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      {item.issueNote || "—"}
                      {item.reportedDate && (
                        <div className="text-[10px] mt-0.5">
                          {gregorianToPersian(item.reportedDate)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted border-t border-border">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 text-sm font-medium text-muted-foreground text-right">
                  جمع کسری باز:
                </td>
                <td className="px-2 py-2.5 text-center text-sm font-bold text-amber-700 dark:text-amber-400">
                  {report.totalOpenShortageQty.toLocaleString("fa-IR")}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* نسخه موبایل: کارت */}
        <div className="md:hidden space-y-2">
          {report.items.map((item) => {
            const style =
              PURCHASE_ISSUE_TYPE_STYLES[item.issueType] ??
              PURCHASE_ISSUE_TYPE_STYLES.other;
            return (
              <div
                key={item.issueId}
                className="border border-border rounded-lg p-3 space-y-2 bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-card-foreground text-sm truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.productCode}</p>
                  </div>
                  <Badge variant="outline" className={`text-[11px] shrink-0 ${style}`}>
                    {PURCHASE_ISSUE_TYPE_LABELS[item.issueType] ?? item.issueType}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
                  <span>
                    سفارش: {item.orderedQty.toLocaleString("fa-IR")} | دریافت:{" "}
                    {item.receivedQty.toLocaleString("fa-IR")}
                  </span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    کسری: {item.openShortageQty.toLocaleString("fa-IR")}
                  </span>
                </div>
                {item.issueNote && (
                  <p className="text-xs text-muted-foreground">{item.issueNote}</p>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 border border-border">
            <span className="text-sm font-medium text-muted-foreground">جمع کسری باز:</span>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {report.totalOpenShortageQty.toLocaleString("fa-IR")}
            </span>
          </div>
        </div>

        {report.receivingNote && (
          <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
            یادداشت کلی انبار: {report.receivingNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}