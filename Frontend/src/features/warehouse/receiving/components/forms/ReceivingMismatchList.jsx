// src/features/warehouse/receiving/components/forms/ReceivingMismatchList.jsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageX, Undo2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';

// این کامپوننت فقط اقلامی را نشان می‌دهد که کسری دارند، تا مسئول انبار پیش از تأیید
// نهایی یک نمای سریع از مغایرت‌ها داشته باشد و در صورت نیاز مستقیماً به ثبت مرجوعی برود.
export default function ReceivingMismatchList({ purchaseId, items }) {
  const navigate = useNavigate();

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
          کسری‌های این سفارش
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {totalShortage.toLocaleString('fa-IR')} قلم کسری
        </span>
      </CardHeader>

      <CardContent className="space-y-2">
        <ul className="divide-y divide-border text-sm">
          {shortItems.map((item) => {
            const shortage = item.expectedQty - (item.receivedQty || 0);
            return (
              <li key={item.productId} className="flex items-center justify-between py-1.5">
                <div className="min-w-0">
                  <p className="font-medium text-card-foreground truncate">{item.productName}</p>
                  {item.note && (
                    <p className="text-xs text-muted-foreground truncate">{item.note}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400 tabular-nums">
                  کسری {shortage.toLocaleString('fa-IR')} عدد
                </span>
              </li>
            );
          })}
        </ul>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2 mt-2"
          onClick={() =>
            navigate(ROUTES.PURCHASE_RETURNS_NEW, {
              state: { purchaseId, items: shortItems },
            })
          }
        >
          <Undo2 className="h-3.5 w-3.5" />
          ثبت مرجوعی برای کسری‌ها
        </Button>
      </CardContent>
    </Card>
  );
}