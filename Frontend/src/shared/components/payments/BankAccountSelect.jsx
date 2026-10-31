import OptionSelect from "@/shared/components/forms/OptionSelect";
import { BANK_ACCOUNT_KIND_LABELS, BankAccountKindEnum } from "@/shared/domain/enums/bankAccount";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { useBankAccountOptionsQuery } from "@/shared/services/bankAccounts/queries";
import { getIranianBank } from "@/shared/lib/iranian-bank";
import { cn } from "@/shared/lib/utils";
import LazyBankLogo from "./LazyBankLogo";

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
export default function BankAccountSelect({ id, value, onChange, paymentType, className, "aria-label": ariaLabel }) {
  const { data: options = [], isLoading } = useBankAccountOptionsQuery();
  if (!isLoading && options.length === 0) return null;

  const kind = preferredKind(paymentType);
  const sorted = [...options].sort((a, b) => (a.kind === kind ? 0 : 1) - (b.kind === kind ? 0 : 1));

  return (
    <OptionSelect
      id={id}
      dir="rtl"
      value={value}
      onChange={onChange}
      numeric
      isLoading={isLoading}
      placeholder="صندوق / حساب"
      emptyLabel={<span className="text-muted-foreground">بدون صندوق/حساب</span>}
      emptyValue={null}
      className={cn("h-9 w-full", className)}
      aria-label={ariaLabel}
      options={sorted.map((account) => ({
        value: account.id,
        label: (
          <>
            {account.kind === BankAccountKindEnum.BANK && (
              <LazyBankLogo bank={getIranianBank(account)} className="size-4" />
            )}
            {account.title}
            <span className="text-xs text-muted-foreground">
              {" · "}
              {account.bankName || BANK_ACCOUNT_KIND_LABELS[account.kind]}
            </span>
          </>
        ),
      }))}
    />
  );
}
