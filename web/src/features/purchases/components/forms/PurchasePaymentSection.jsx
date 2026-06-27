// src/features/purchases/components/PurchasePaymentSection.jsx
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

const PAYMENT_TYPES = [
  { value: 'cash', label: 'نقدی' },
  { value: 'credit', label: 'نسیه' },
  { value: 'check', label: 'چک' },
  { value: 'transfer', label: 'انتقال بانکی' },
  { value: 'mixed', label: 'ترکیبی' },
];

/**
 * props: formData, onFormChange, totalAmount, errors
 */
export default function PurchasePaymentSection({
  formData,
  onFormChange,
  totalAmount = 0,
  errors,
}) {
  const handleChange = (field, value) => {
    onFormChange({ [field]: value });
  };

  const paymentType = formData.paymentType || 'cash';
  const paidAmount = Number(formData.paidAmount) || 0;
  const remaining = totalAmount - paidAmount;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اطلاعات پرداخت
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* خلاصه مبالغ */}
        <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">جمع کل فاکتور</span>
            <span className="font-medium text-card-foreground">
              {totalAmount.toLocaleString('fa-IR')} ریال
            </span>
          </div>
          {paymentType !== 'credit' && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">مبلغ پرداختی</span>
                <span className="font-medium text-card-foreground">
                  {paidAmount.toLocaleString('fa-IR')} ریال
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-2">
                <span className="text-muted-foreground">مانده بدهی</span>
                <span className={`font-semibold ${
                  remaining > 0 
                    ? 'text-destructive' 
                    : 'text-[oklch(0.50_0.16_152)]'
                }`}>
                  {remaining.toLocaleString('fa-IR')} ریال
                </span>
              </div>
            </>
          )}
        </div>

        {/* نوع پرداخت */}
        <div className="space-y-1.5">
          <Label className="text-card-foreground text-sm font-medium">
            نوع پرداخت
          </Label>
          <Select
            value={paymentType}
            onValueChange={(val) => handleChange('paymentType', val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* مبلغ پرداختی */}
        {paymentType !== 'credit' && (
          <div className="space-y-1.5">
            <Label 
              htmlFor="paidAmount"
              className="text-card-foreground text-sm font-medium"
            >
              مبلغ پرداختی (ریال)
            </Label>
            <Input
              id="paidAmount"
              type="number"
              dir="ltr"
              min={0}
              placeholder="صفر"
              value={formData.paidAmount || ''}
              onChange={(e) => handleChange('paidAmount', e.target.value)}
              className={`h-9 input-rtl-placeholder ${
                errors?.paidAmount 
                  ? 'border-destructive focus-visible:ring-destructive/30' 
                  : ''
              }`}
            />
            {errors?.paidAmount && (
              <p className="text-xs text-destructive">{errors.paidAmount}</p>
            )}
          </div>
        )}

        {/* شماره چک */}
        {paymentType === 'check' && (
          <div className="space-y-1.5">
            <Label 
              htmlFor="checkNumber"
              className="text-card-foreground text-sm font-medium"
            >
              شماره چک
            </Label>
            <Input
              id="checkNumber"
              placeholder="شماره چک را وارد کنید"
              value={formData.checkNumber || ''}
              onChange={(e) => handleChange('checkNumber', e.target.value)}
              className="input-rtl-placeholder h-9"
              dir="ltr"
            />
          </div>
        )}

        {/* شماره پیگیری */}
        {paymentType === 'transfer' && (
          <div className="space-y-1.5">
            <Label 
              htmlFor="transferRef"
              className="text-card-foreground text-sm font-medium"
            >
              شماره پیگیری
            </Label>
            <Input
              id="transferRef"
              placeholder="شماره پیگیری انتقال"
              value={formData.transferRef || ''}
              onChange={(e) => handleChange('transferRef', e.target.value)}
              className="input-rtl-placeholder h-9"
              dir="ltr"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
