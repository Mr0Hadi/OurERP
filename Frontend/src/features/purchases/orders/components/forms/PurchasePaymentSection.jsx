// src/features/purchases/components/forms/PurchasePaymentSection.jsx
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
import { Button } from '@/shared/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

const PAYMENT_TYPES = [
  { value: 'cash', label: 'نقدی' },
  { value: 'credit', label: 'نسیه' },
  { value: 'check', label: 'چک' },
  { value: 'transfer', label: 'انتقال بانکی' },
  { value: 'mixed', label: 'ترکیبی' },
];

const SINGLE_PAYMENT_TYPES = [
  { value: 'cash', label: 'نقدی' },
  { value: 'check', label: 'چک' },
  { value: 'transfer', label: 'انتقال بانکی' },
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
  const mixedPayments = formData.mixedPayments || [];

  // محاسبه مجموع پرداخت‌های ترکیبی
  const totalMixedPaid = mixedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  // مبلغ پرداختی کل
  const paidAmount = paymentType === 'mixed' 
    ? totalMixedPaid 
    : (Number(formData.paidAmount) || 0);
  
  const remaining = totalAmount - paidAmount;

  // اضافه کردن پرداخت جدید به لیست ترکیبی
  const handleAddMixedPayment = () => {
    const newPayment = {
      id: Date.now().toString(),
      type: 'cash',
      amount: '',
      checkNumber: '',
      transferRef: '',
    };
    onFormChange({ 
      mixedPayments: [...mixedPayments, newPayment] 
    });
  };

  // حذف یک پرداخت از لیست ترکیبی
  const handleRemoveMixedPayment = (id) => {
    onFormChange({ 
      mixedPayments: mixedPayments.filter(p => p.id !== id) 
    });
  };

  // تغییر یک فیلد در پرداخت ترکیبی
  const handleMixedPaymentChange = (id, field, value) => {
    onFormChange({
      mixedPayments: mixedPayments.map(p => 
        p.id === id ? { ...p, [field]: value } : p
      )
    });
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
            onValueChange={(val) => {
              handleChange('paymentType', val);
              // اگر به ترکیبی تغییر کرد و لیست خالی بود، یک آیتم اضافه کن
              if (val === 'mixed' && mixedPayments.length === 0) {
                handleAddMixedPayment();
              }
            }}
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

        {/* حالت ترکیبی */}
        {paymentType === 'mixed' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-card-foreground text-sm font-medium">
                روش‌های پرداخت
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMixedPayment}
                className="gap-1 h-8"
              >
                <Plus className="h-3.5 w-3.5" />
                افزودن روش پرداخت
              </Button>
            </div>

            {mixedPayments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                هیچ روش پرداختی اضافه نشده است
              </div>
            )}

            {mixedPayments.map((payment, index) => (
              <div 
                key={payment.id} 
                className="border border-border rounded-lg p-3 space-y-3 bg-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-card-foreground">
                    پرداخت {index + 1}
                  </span>
                  {mixedPayments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMixedPayment(payment.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* نوع روش پرداخت */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    روش پرداخت
                  </Label>
                  <Select
                    value={payment.type}
                    onValueChange={(val) => handleMixedPaymentChange(payment.id, 'type', val)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SINGLE_PAYMENT_TYPES.map((t) => (
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
                    placeholder="صفر"
                    value={payment.amount || ''}
                    onChange={(e) => handleMixedPaymentChange(payment.id, 'amount', e.target.value)}
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
                      onChange={(e) => handleMixedPaymentChange(payment.id, 'checkNumber', e.target.value)}
                      className="input-rtl-placeholder h-9"
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
                      onChange={(e) => handleMixedPaymentChange(payment.id, 'transferRef', e.target.value)}
                      className="input-rtl-placeholder h-9"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>
            ))}

            {errors?.mixedPayments && (
              <p className="text-xs text-destructive">{errors.mixedPayments}</p>
            )}
          </div>
        )}

        {/* حالت‌های تک‌روشی (غیر از ترکیبی و نسیه) */}
        {paymentType !== 'credit' && paymentType !== 'mixed' && (
          <>
            {/* مبلغ پرداختی */}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
