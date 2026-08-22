import { useMemo } from 'react';
import { PackageX, PackagePlus, HelpCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  RECEIVING_ISSUE_TYPE_LABELS,
  RECEIVING_ISSUE_TYPE_STYLES,
  SURPLUS_KINDS,
  SURPLUS_KIND_LABELS,
  SURPLUS_KIND_STYLES,
} from '../../domain/receivingVocabulary';

// پیش‌نمایش زنده‌ی هر چیزی که در این دریافت با سفارش نمی‌خواند، پیش از
// ثبت نهایی: کسری (به تفکیک نوع مشکل)، مازادِ کالاهای شناخته‌شده، و
// کالاهای ثبت‌نشده. هیچ اکشنی (مثل ثبت مرجوعی) از اینجا انجام نمی‌شود.
export default function ReceivingMismatchList({ items, unknownItems = [] }) {
  const shortItems = useMemo(
    () => items.filter((item) => (item.receivedQty || 0) < item.expectedQty),
    [items]
  );

  const excessItems = useMemo(
    () => items.filter((item) => (Number(item.excessQty) || 0) > 0),
    [items]
  );

  const namedUnknownItems = useMemo(
    () =>
      unknownItems.filter(
        (row) => row.productName?.trim() && (Number(row.qty) || 0) > 0
      ),
    [unknownItems]
  );

  if (
    shortItems.length === 0 &&
    excessItems.length === 0 &&
    namedUnknownItems.length === 0
  ) {
    return null;
  }

  const totalShortage = shortItems.reduce(
    (sum, item) => sum + (item.expectedQty - (item.receivedQty || 0)),
    0
  );
  const totalExcess = excessItems.reduce(
    (sum, item) => sum + (Number(item.excessQty) || 0),
    0
  );
  const totalUnknown = namedUnknownItems.reduce(
    (sum, row) => sum + (Number(row.qty) || 0),
    0
  );

  const summary = [
    totalShortage > 0 && `${totalShortage.toLocaleString('fa-IR')} عدد کسری`,
    totalExcess > 0 && `${totalExcess.toLocaleString('fa-IR')} عدد اضافه`,
    totalUnknown > 0 && `${totalUnknown.toLocaleString('fa-IR')} عدد ثبت‌نشده`,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PackageX className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          پیش‌نمایش گزارش مغایرت این دریافت
        </CardTitle>
        <span className="text-xs text-muted-foreground">{summary}</span>
      </CardHeader>

      <CardContent className="space-y-3">
        {shortItems.map((item) => {
          const shortage = item.expectedQty - (item.receivedQty || 0);
          const issues = item.issues || [];

          return (
            <div key={`short-${item.productId}`} className="space-y-1.5">
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
                      RECEIVING_ISSUE_TYPE_STYLES[issue.issueType] ??
                      RECEIVING_ISSUE_TYPE_STYLES.other;
                    return (
                      <li
                        key={issue.id}
                        className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded-md px-2 py-1"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${style}`}>
                            {RECEIVING_ISSUE_TYPE_LABELS[issue.issueType] ?? issue.issueType}
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

        {/* مازاد و کالای ثبت‌نشده — هر دو «مازاد»اند و مسیر تصمیم
            یکسانی دارند، پس کنار هم و جدا از کسری نشان داده می‌شوند.
            یک کالا می‌تواند هم‌زمان در هر دو فهرست بالا و پایین باشد. */}
        {(excessItems.length > 0 || namedUnknownItems.length > 0) && (
          <div className="space-y-1.5 border-t border-border/60 pt-3">
            {excessItems.map((item) => (
              <div
                key={`excess-${item.productId}`}
                className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded-md px-2 py-1"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 gap-1 ${SURPLUS_KIND_STYLES[SURPLUS_KINDS.EXCESS]}`}
                  >
                    <PackagePlus className="h-3 w-3" />
                    {SURPLUS_KIND_LABELS[SURPLUS_KINDS.EXCESS]}
                  </Badge>
                  <span className="font-medium text-card-foreground truncate">
                    {item.productName}
                  </span>
                  {item.excessNote && (
                    <span className="text-muted-foreground truncate">{item.excessNote}</span>
                  )}
                </div>
                <span className="shrink-0 tabular-nums font-medium text-card-foreground">
                  {(Number(item.excessQty) || 0).toLocaleString('fa-IR')} عدد
                </span>
              </div>
            ))}

            {namedUnknownItems.map((row) => (
              <div
                key={`unknown-${row.id}`}
                className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded-md px-2 py-1"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 gap-1 ${SURPLUS_KIND_STYLES[SURPLUS_KINDS.UNKNOWN]}`}
                  >
                    <HelpCircle className="h-3 w-3" />
                    {SURPLUS_KIND_LABELS[SURPLUS_KINDS.UNKNOWN]}
                  </Badge>
                  <span className="font-medium text-card-foreground truncate">
                    {row.productName}
                  </span>
                  {row.note && (
                    <span className="text-muted-foreground truncate">{row.note}</span>
                  )}
                </div>
                <span className="shrink-0 tabular-nums font-medium text-card-foreground">
                  {(Number(row.qty) || 0).toLocaleString('fa-IR')} {row.unit || 'عدد'}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
          پس از ثبت دریافت، این گزارش دقیقاً همین‌طور برای واحد خرید قابل مشاهده است.
          کالای اضافه و ثبت‌نشده وارد موجودی قابل‌فروش نمی‌شود تا تصمیم گرفته شود.
        </p>
      </CardContent>
    </Card>
  );
}
