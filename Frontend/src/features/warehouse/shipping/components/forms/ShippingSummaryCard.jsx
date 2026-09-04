import { useMemo } from 'react';
import { Loader2, PackageOpen, PackageCheck, Activity, FileText } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import PersianDatePicker from '@/shared/components/ui/persian-date-picker';
import {
  SaleStatusEnum as SALE_STATUSES,
  SALE_STATUS_LABELS,
} from '@/shared/domain/enums/saleStatus';
import { gregorianToPersian } from '@/shared/utils/dateUtils';

const STATUS_CONFIG = {
  [SALE_STATUSES.PROFORMA]: {
    icon: FileText,
    textColor: 'text-slate-600 dark:text-slate-300',
  },
  [SALE_STATUSES.PROCESSING]: { icon: Loader2, textColor: 'text-blue-600 dark:text-blue-400' },
  [SALE_STATUSES.PARTIALLY_DELIVERED]: {
    icon: PackageOpen,
    textColor: 'text-orange-600 dark:text-orange-400',
  },
  [SALE_STATUSES.SHIPPED]: {
    icon: PackageCheck,
    textColor: 'text-indigo-600 dark:text-indigo-400',
  },
  [SALE_STATUSES.DELIVERED]: {
    icon: PackageCheck,
    textColor: 'text-[oklch(0.50_0.16_152)] dark:text-[oklch(0.70_0.16_152)]',
  },
};
const DEFAULT_STATUS_CONFIG = { icon: Activity, textColor: 'text-card-foreground' };

export default function ShippingSummaryCard({ formData, onFormChange }) {
  const handleChange = (field, value) => onFormChange({ [field]: value });

  const stats = useMemo(() => {
    const items = formData.items || [];
    const expected = items.reduce((sum, i) => sum + (i.expectedQuantity || 0), 0);
    const shipped = items.reduce((sum, i) => sum + (i.shippedQuantity || 0), 0);
    const percent = expected > 0 ? Math.round((shipped / expected) * 100) : 0;
    return { expected, shipped, percent };
  }, [formData.items]);

  const config = STATUS_CONFIG[formData.status] ?? DEFAULT_STATUS_CONFIG;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">اطلاعات ارسال</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">وضعیت فروش</span>
          <Badge variant="secondary" className={`gap-1.5 ${config.textColor}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {SALE_STATUS_LABELS[formData.status] ?? formData.status}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>پیشرفت ارسال</span>
            <span className="tabular-nums font-medium text-card-foreground">
              {stats.shipped.toLocaleString('fa-IR')} / {stats.expected.toLocaleString('fa-IR')}{' '}
              ({stats.percent.toLocaleString('fa-IR')}٪)
            </span>
          </div>
          <Progress value={stats.percent} className="h-2" />
        </div>

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
