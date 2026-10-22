import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { BANK_ACCOUNT_KIND_LABELS, BankAccountKindEnum } from "@/shared/domain/enums/bankAccount";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { useBankAccountOptionsQuery } from "@/shared/services/bankAccounts/queries";
import { cn } from "@/shared/lib/utils";

/** Radix مقدارِ خالی را «بدون انتخاب» می‌فهمد؛ «بدون حساب» مقدارِ صریحِ خودش را دارد. */
const NONE = "none";

/** نقدی معمولاً صندوق است و انتقال بانک: همان نوع اول فهرست می‌آید. */
const preferredKind = (paymentType) =>
  paymentType === PaymentTypeEnum.CASH ? BankAccountKindEnum.CASH_BOX : BankAccountKindEnum.BANK;

/**
 * صندوق یا حسابی که یک دریافت/پرداخت از آن گذشت (`bankAccountId` روی هر ثبتِ پول، `api-guide` بخش ۲۳).
 * اختیاری است؛ پولِ بی‌حساب در مانده‌ی هیچ صندوق و بانکی نمی‌آید. وقتی هنوز حسابی تعریف نشده چیزی رندر نمی‌شود.
 *
 * فقط برای روش‌هایی که پول همان لحظه جابه‌جا می‌شود (`takesBankAccount`): چک هنگامِ وصول حساب می‌گیرد.
 *
 * @param value       `bankAccountId` یا `null`
 * @param onChange    `(id|null) => void`
 * @param paymentType برای ترتیبِ گزینه‌ها (نقدی ← صندوق‌ها اول)
 */
export default function BankAccountSelect({ id, value, onChange, paymentType, className, ...props }) {
  const { data: options = [], isLoading } = useBankAccountOptionsQuery();
  if (!isLoading && options.length === 0) return null;

  const kind = preferredKind(paymentType);
  const sorted = [...options].sort((a, b) => (a.kind === kind ? 0 : 1) - (b.kind === kind ? 0 : 1));

  return (
    <Select
      dir="rtl"
      value={value ? String(value) : NONE}
      onValueChange={(next) => onChange(next === NONE ? null : Number(next))}
      disabled={isLoading}
    >
      <SelectTrigger id={id} className={cn("h-9 w-full", className)} {...props}>
        <SelectValue placeholder="صندوق / حساب" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>
          <span className="text-muted-foreground">بدون صندوق/حساب</span>
        </SelectItem>
        {sorted.map((account) => (
          <SelectItem key={account.id} value={String(account.id)}>
            {account.title}
            <span className="text-xs text-muted-foreground">
              {" · "}
              {account.bankName || BANK_ACCOUNT_KIND_LABELS[account.kind]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
