// src/features/warehouse/receiving/components/forms/ReceivingSummaryCard.jsx
import { useMemo } from 'react';
import { Truck, PackageCheck, PackageOpen, Clock, XCircle, Activity } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { PURCHASE_STATUSES, PURCHASE_STATUS_LABELS } from '@/features/purchases/services/mockData';

// هم‌راستا با STATUS_CONFIG در PurchaseStatusSection، برای یکدستی رنگ‌بندی در کل پروژه
const STATUS_CONFIG = {
  [PURCHASE_STATUSES.PENDING]: { icon: Clock, textColor: 'text-amber-600 dark:text-amber-400' },
  [PURCHASE_STATUSES.SHIPPED]: { icon: Truck, textColor: 'text-blue-600 dark:text-blue-400' },
  [PURCHASE_STATUSES.PARTIALLY_RECEIVED]: { icon: PackageOpen, textColor: 'text-orange-600 dark:text-orange-400' },
  [PURCHASE_STATUSES.RECEIVED]: { icon: PackageCheck, textColor: 'text-[oklch(0.50_0.16_152)] dark:text-[oklch(0.70_0.16_152)]' },
  [PURCHASE_STATUSES.CANCELLED]: { icon: XCircle, textColor: 'text-destructive' },
};
const DEFAULT_STATUS_CONFIG = { icon: Activity, textColor: 'text-card-foreground' };

export default function ReceivingSummaryCard({ formData, onFormChange }) {
  const handleChange = (field, value) => {
    onFormChange({ [field]: value });
  };

  
  const stats = useMemo(() => {
    const items = formData.items || [];
    const expected = items.reduce((sum, i) => sum + (i.expectedQty || 0), 0);
    const received = items.reduce((sum, i) => sum + (i.receivedQty || 0), 0);
    const percent = expected > 0 ? Math.round((received / expected) * 100) : 0;
    return { expected, received, percent };
  }, [formData.items]);

  const config = STATUS_CONFIG[formData.status] ?? DEFAULT_STATUS_CONFIG;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">اطلاعات دریافت</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* وضعیت فعلی خرید */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">وضعیت خرید</span>
          <Badge variant="secondary" className={`gap-1.5 ${config.textColor}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {PURCHASE_STATUS_LABELS[formData.status] ?? formData.status}
          </Badge>
        </div>

        {/* پیشرفت دریافت */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>پیشرفت دریافت</span>
            <span className="tabular-nums font-medium text-card-foreground">
              {stats.received.toLocaleString('fa-IR')} / {stats.expected.toLocaleString('fa-IR')}
              {' '}({stats.percent.toLocaleString('fa-IR')}٪)
            </span>
          </div>
          <Progress value={stats.percent} className="h-2" />
        </div>

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
            <p className="font-medium">{formData.invoiceDate}</p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-sm font-medium">تاریخ دریافت</Label>
          <Input
            type="date"
            value={formData.receivedDate || ''}
            onChange={(e) => handleChange('receivedDate', e.target.value)}
            className="h-8"
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