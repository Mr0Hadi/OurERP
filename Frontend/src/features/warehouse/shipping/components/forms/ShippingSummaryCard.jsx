import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import ProgressStat from '@/shared/components/feedback/ProgressStat';
import PersianDatePicker from '@/shared/components/ui/persian-date-picker';
import SaleStatusBadge from '@/shared/components/status/SaleStatusBadge';
import { gregorianToPersian } from '@/shared/lib/dateUtils';

export default function ShippingSummaryCard({ formData, onFormChange }) {
  const handleChange = (field, value) => onFormChange({ [field]: value });

  const stats = useMemo(() => {
    const items = formData.items || [];
    const remaining = items.reduce((sum, i) => sum + (i.remainingQuantity || 0), 0);
    const shipped = items.reduce((sum, i) => sum + (i.shippedQuantity || 0), 0);
    const percent = remaining > 0 ? Math.round((shipped / remaining) * 100) : 0;
    return { remaining, shipped, percent };
  }, [formData.items]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">اطلاعات ارسال</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">وضعیت فروش</span>
          <SaleStatusBadge status={formData.status} withIcon />
        </div>

        <ProgressStat
          label="مقدارِ این دور از باقیمانده"
          done={stats.shipped}
          total={stats.remaining}
          percent={stats.percent}
        />

        <div className="grid grid-cols-1 gap-2 text-sm border-t border-border pt-3">
          <div>
            <Label className="text-xs text-muted-foreground">مشتری</Label>
            <p className="font-medium">{formData.customerName}</p>
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
          <Label className="text-sm font-medium">تاریخ ارسال</Label>
          <PersianDatePicker
            value={formData.shippedDate}
            onChange={(isoDate) => handleChange('shippedDate', isoDate)}
            placeholder="مثال: ۱۴۰۵/۰۵/۰۲"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">یادداشت ارسال</Label>
          <Textarea
            placeholder="توضیحات کلی..."
            value={formData.shippingNote || ''}
            onChange={(e) => handleChange('shippingNote', e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
