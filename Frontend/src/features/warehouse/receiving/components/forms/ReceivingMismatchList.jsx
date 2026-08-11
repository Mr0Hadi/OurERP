import { useMemo } from 'react';
import { PackageX } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  PURCHASE_ISSUE_TYPE_LABELS,
  PURCHASE_ISSUE_TYPE_STYLES,
} from '@/shared/constants/purchaseIssueTypes';

// پیش‌نمایش زنده‌ی کسری‌های این دریافت پیش از ثبت نهایی؛ چون هر قلم
// می‌تواند بین چند نوع مشکل تقسیم شده باشد، همه‌ی ردیف‌های تفکیک‌شده
// را نشان می‌دهیم. هیچ اکشنی (مثل ثبت مرجوعی) از اینجا انجام نمی‌شود.
export default function ReceivingMismatchList({ items }) {
  const shortItems = useMemo(
    () => items.filter((item) => (item.receivedQty || 0) < item.expectedQty),
    [items]
  );

  if (shortItems.length === 0) return null;

  const totalShortage = shortItems.reduce(
    (sum, item) => sum + (item.expectedQty - (item.receivedQty || 0)),
    0
  );

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PackageX className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          پیش‌نمایش گزارش کسری این دریافت
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {totalShortage.toLocaleString('fa-IR')} عدد کسری
        </span>
      </CardHeader>

      <CardContent className="space-y-3">
        {shortItems.map((item) => {
          const shortage = item.expectedQty - (item.receivedQty || 0);
          const issues = item.issues || [];

          return (
            <div key={item.productId} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-card-foreground text-sm">{item.productName}</p>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400 tabular-nums">
                  کسری {shortage.toLocaleString('fa-IR')} عدد
                </span>
              </div>

              {issues.length !== 0 && (
                <ul className="space-y-1">
                  {issues.map((issue) => {
                    const style =
                      PURCHASE_ISSUE_TYPE_STYLES[issue.issueType] ??
                      PURCHASE_ISSUE_TYPE_STYLES.other;
                    return (
                      <li
                        key={issue.id}
                        className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded-md px-2 py-1"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${style}`}>
                            {PURCHASE_ISSUE_TYPE_LABELS[issue.issueType] ?? issue.issueType}
                          </Badge>
                          {issue.note && (
                            <span className="text-muted-foreground truncate">{issue.note}</span>
                          )}
                        </div>
                        <span className="shrink-0 tabular-nums font-medium text-card-foreground">
                          {(Number(issue.qty) || 0).toLocaleString('fa-IR')} عدد
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
          پس از ثبت دریافت، این گزارش دقیقاً همین‌طور، به تفکیک نوع مشکل، برای واحد خرید قابل مشاهده است.
        </p>
      </CardContent>
    </Card>
  );
}