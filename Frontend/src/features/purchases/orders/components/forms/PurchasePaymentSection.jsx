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
import PaymentSummary from '@/shared/components/forms/PaymentSummary';
import MixedPaymentList from './MixedPaymentList';

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
  const mixedPayments = formData.mixedPayments || [];

  // محاسبه مجموع پرداخت‌های ترکیبی
  const totalMixedPaid = mixedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // مبلغ پرداختی کل
  const paidAmount = paymentType === 'mixed'
    ? totalMixedPaid
    : (Number(formData.paidAmount) || 0);

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
      mixedPayments: [...mixedPayments, newPayment],
    });
  };

  // حذف یک پرداخت از لیست ترکیبی
  const handleRemoveMixedPayment = (id) => {
    onFormChange({
      mixedPayments: mixedPayments.filter(p => p.id !== id),
    });
  };

  // تغییر یک فیلد در پرداخت ترکیبی
  const handleMixedPaymentChange = (id, field, value) => {
    onFormChange({
      mixedPayments: mixedPayments.map(p =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
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
        <PaymentSummary
          totalAmount={totalAmount}
          paidAmount={paidAmount}
          isCredit={paymentType === 'credit'}
        />

        {/* نوع پرداخت */}
        <div className="space-y-1.5">
          <Label className="text-card-foreground text-sm font-medium">
            نوع پرداخت
          </Label>
          <Select
            value={paymentType}
            onValueChange={(val) => {
              // اگر به ترکیبی تغییر کرد و لیست خالی بود، یک آیتم اضافه کن
              const nextMixedPayments =
                val === 'mixed' && mixedPayments.length === 0
                  ? [
                      {
                        id: Date.now().toString(),
                        type: 'cash',
                        amount: '',
                        checkNumber: '',
                        transferRef: '',
                      },
                    ]
                  : mixedPayments;
              // برای روش‌های تک‌مرحله‌ای (نقدی/چک/انتقال) مبلغ پرداختی
              // به‌صورت پیش‌فرض همان جمع کل سند است.
              const isSingleMethod = val !== 'credit' && val !== 'mixed';
              onFormChange({
                paymentType: val,
                mixedPayments: nextMixedPayments,
                paidAmount: isSingleMethod ? String(totalAmount) : '',
              });
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
          <MixedPaymentList
            mixedPayments={mixedPayments}
            onAdd={handleAddMixedPayment}
            onRemove={handleRemoveMixedPayment}
            onChange={handleMixedPaymentChange}
            errors={errors}
          />
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
