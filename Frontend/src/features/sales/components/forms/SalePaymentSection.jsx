// src/features/sales/components/SalePaymentSection.jsx
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

const PAYMENT_TYPES = [
  { value: 'cash', label: 'نقدی' },
  { value: 'credit', label: 'نسیه' },
  { value: 'check', label: 'چک' },
  { value: 'transfer', label: 'انتقال بانکی' },
  { value: 'mixed', label: 'ترکیبی' },
];

const MIXED_PAYMENT_TYPES = [
  { value: 'cash', label: 'نقدی' },
  { value: 'check', label: 'چک' },
  { value: 'transfer', label: 'انتقال بانکی' },
];

/**
 * props: formData, onFormChange, totalAmount, errors
 */
export default function SalePaymentSection({
  formData,
  onFormChange,
  totalAmount = 0,
  errors,
}) {
  const handleChange = (field, value) => {
    onFormChange({ [field]: value });
  };

  const paymentType = formData.paymentType || 'cash';
  const mixedPayments = formData.mixedPayments || [];

  // محاسبه مبلغ پرداختی از mixedPayments در حالت ترکیبی
  const paidAmountMixed = mixedPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const paidAmount =
    paymentType === 'mixed'
      ? paidAmountMixed
      : Number(formData.paidAmount) || 0;

  const remaining = totalAmount - paidAmount;

  // مدیریت تغییر نوع پرداخت
  const handlePaymentTypeChange = (val) => {
    handleChange('paymentType', val);
    if (val === 'mixed') {
      // مقداردهی اولیه برای پرداخت‌های ترکیبی
      onFormChange({
        mixedPayments: [{ type: 'cash', amount: '', checkNumber: '', transferRef: '' }],
        paidAmount: '',
        checkNumber: '',
        transferRef: '',
      });
    } else {
      // پاک کردن mixedPayments
      onFormChange({
        mixedPayments: [],
        paidAmount: '',
        checkNumber: '',
        transferRef: '',
      });
    }
  };

  // افزودن پرداخت جدید در حالت ترکیبی
  const addMixedPayment = () => {
    const updated = [
      ...mixedPayments,
      { type: 'cash', amount: '', checkNumber: '', transferRef: '' },
    ];
    onFormChange({ mixedPayments: updated });
  };

  // حذف یک پرداخت از لیست
  const removeMixedPayment = (index) => {
    const updated = mixedPayments.filter((_, i) => i !== index);
    onFormChange({ mixedPayments: updated });
  };

  // تغییر یک فیلد در یک پرداخت خاص
  const updateMixedPayment = (index, field, value) => {
    const updated = [...mixedPayments];
    updated[index] = { ...updated[index], [field]: value };
    onFormChange({ mixedPayments: updated });
  };

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
                <span
                  className={`font-semibold ${
                    remaining > 0
                      ? 'text-destructive'
                      : 'text-[oklch(0.50_0.16_152)]'
                  }`}
                >
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
          <Select value={paymentType} onValueChange={handlePaymentTypeChange}>
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

        {/* حالت ترکیبی */}
        {paymentType === 'mixed' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-card-foreground text-sm font-medium">
                پرداخت‌های ترکیبی
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMixedPayment}
                className="h-8 gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                افزودن پرداخت
              </Button>
            </div>

            {mixedPayments.map((payment, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-card p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">
                    پرداخت {idx + 1}
                  </span>
                  {mixedPayments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMixedPayment(idx)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* نوع پرداخت */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">نوع</Label>
                  <Select
                    value={payment.type}
                    onValueChange={(val) => updateMixedPayment(idx, 'type', val)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MIXED_PAYMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* مبلغ */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    مبلغ (ریال)
                  </Label>
                  <Input
                    type="number"
                    dir="ltr"
                    min={0}
                    placeholder="مبلغ"
                    value={payment.amount || ''}
                    onChange={(e) =>
                      updateMixedPayment(idx, 'amount', e.target.value)
                    }
                    className="h-9 input-rtl-placeholder"
                  />
                </div>

                {/* شماره چک */}
                {payment.type === 'check' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      شماره چک
                    </Label>
                    <Input
                      placeholder="شماره چک"
                      value={payment.checkNumber || ''}
                      onChange={(e) =>
                        updateMixedPayment(idx, 'checkNumber', e.target.value)
                      }
                      className="h-9 input-rtl-placeholder"
                      dir="ltr"
                    />
                  </div>
                )}

                {/* شماره پیگیری */}
                {payment.type === 'transfer' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      شماره پیگیری
                    </Label>
                    <Input
                      placeholder="شماره پیگیری"
                      value={payment.transferRef || ''}
                      onChange={(e) =>
                        updateMixedPayment(idx, 'transferRef', e.target.value)
                      }
                      className="h-9 input-rtl-placeholder"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* مبلغ پرداختی (غیر از نسیه و ترکیبی) */}
        {paymentType !== 'credit' && paymentType !== 'mixed' && (
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

        {/* شماره چک (برای نوع check) */}
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

        {/* شماره پیگیری (برای نوع transfer) */}
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
