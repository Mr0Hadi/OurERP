import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import ProgressStat from '@/shared/components/feedback/ProgressStat';
import PersianDatePicker from '@/shared/components/ui/persian-date-picker';
import PurchaseStatusBadge from '@/shared/components/status/PurchaseStatusBadge';
import { gregorianToPersian } from '@/shared/lib/dateUtils';

/** `replacementOnly`: دریافتِ کالای جایگزینِ مرجوعی، نه خودِ خرید — پیشرفتِ خرید بی‌ربط است. */
export default function ReceivingSummaryCard({
  formData,
  onFormChange,
  replacementOnly = false,
}) {
  const handleChange = (field, value) => {
    onFormChange({ [field]: value });
  };

  const stats = useMemo(() => {
    const items = formData.items || [];
    const stillOwed = items.reduce((sum, i) => sum + (i.stillOwedQuantity || 0), 0);
    // سهمِ سفارشِ همین دور؛ رسیده‌ی بیش از باقیمانده (مازاد) پیشرفت را بالا نمی‌برد.
    const received = items.reduce(
      (sum, i) => sum + Math.min(i.arrivedQuantity || 0, i.stillOwedQuantity || 0),
      0,
    );
    const percent = stillOwed > 0 ? Math.round((received / stillOwed) * 100) : 100;
    return { stillOwed, received, percent };
  }, [formData.items]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">اطلاعات دریافت</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* وضعیت فعلی خرید */}
        {!replacementOnly && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">وضعیت خرید</span>
              <PurchaseStatusBadge status={formData.status} withIcon />
            </div>

            {/* چقدر از باقیمانده‌ی سفارش در همین دور می‌رسد — نه پیشرفتِ کلِ خرید. */}
            <ProgressStat
              label="مقدارِ این دور از باقیمانده"
              done={stats.received}
              total={stats.stillOwed}
              percent={stats.percent}
            />
          </>
        )}

        <div className="grid grid-cols-1 gap-2 text-sm border-t border-border pt-3">
          <div>
            <Label className="text-xs text-muted-foreground">تأمین‌کننده</Label>
            <p className="font-medium">{formData.supplierName}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">شماره فاکتور</Label>
            <p className="font-medium">{formData.invoiceNumber}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">تاریخ فاکتور</Label>
            <p className="font-medium">{gregorianToPersian(formData.invoiceDate)}</p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-sm font-medium">تاریخ دریافت</Label>
          <PersianDatePicker
            value={formData.receivedDate}
            onChange={(isoDate) => handleChange('receivedDate', isoDate)}
            placeholder="مثال: ۱۴۰۵/۰۵/۰۲"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">یادداشت دریافت</Label>
          <Textarea
            placeholder="توضیحات کلی..."
            value={formData.receivingNote || ''}
            onChange={(e) => handleChange('receivingNote', e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}