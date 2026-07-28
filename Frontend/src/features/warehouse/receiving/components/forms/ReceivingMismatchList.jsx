// src/features/warehouse/receiving/components/forms/ReceivingMismatchList.jsx
import { useMemo } from 'react';
import { PackageX } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  PURCHASE_ISSUE_TYPE_LABELS,
  PURCHASE_ISSUE_TYPE_STYLES,
} from '@/shared/constants/purchaseIssueTypes';

// این کامپوننت فقط یک پیش‌نمایش زنده از کسری‌های این دریافت است، پیش از
// ثبت نهایی. هیچ اکشنی (مثل ثبت مرجوعی) از اینجا انجام نمی‌شود — ثبت
// مرجوعی به تامین‌کننده کاملاً بر عهده‌ی واحد خرید است، نه انباردار.
// پس از ثبت دریافت، این گزارش به‌طور خودکار در دسترس واحد خرید قرار می‌گیرد.
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
          {totalShortage.toLocaleString('fa-IR')} قلم کسری
        </span>
      </CardHeader>

      <CardContent className="space-y-2">
        <ul className="divide-y divide-border text-sm">
          {shortItems.map((item) => {
            const shortage = item.expectedQty - (item.receivedQty || 0);
            const style =
              PURCHASE_ISSUE_TYPE_STYLES[item.issueType] ??
              PURCHASE_ISSUE_TYPE_STYLES.other;
            return (
              <li key={item.productId} className="flex items-center justify-between gap-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-card-foreground truncate">{item.productName}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <Badge variant="outline" className={`text-[10px] ${style}`}>
                      {PURCHASE_ISSUE_TYPE_LABELS[item.issueType] ?? item.issueType}
                    </Badge>
                    {item.note && (
                      <span className="text-xs text-muted-foreground truncate">{item.note}</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400 tabular-nums">
                  کسری {shortage.toLocaleString('fa-IR')} عدد
                </span>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
          پس از ثبت دریافت، این گزارش دقیقاً همین‌طور برای واحد خرید قابل مشاهده است.
        </p>
      </CardContent>
    </Card>
  );
}