import { ShieldCheck, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import FormPriceField from "@/shared/components/forms/FormPriceField";
import FormSelectField from "@/shared/components/forms/FormSelectField";
import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";

const BALANCE_ICONS = {
  [BalanceTypeEnum.BALANCED]: <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />,
  [BalanceTypeEnum.DEBTOR]: <TrendingUp className="h-4 w-4 text-success" />,
  [BalanceTypeEnum.CREDITOR]: <TrendingDown className="h-4 w-4 text-destructive" />,
};

/** متنِ نوعِ حساب از دیدِ همان طرف؛ برای تامین‌کننده «بدهکار» یعنی او به ما بدهکار است. */
const BALANCE_LABELS = {
  customer: {
    [BalanceTypeEnum.BALANCED]: "بی‌حساب (صفر)",
    [BalanceTypeEnum.DEBTOR]: "بدهکار",
    [BalanceTypeEnum.CREDITOR]: "طلبکار (طلبکار)",
  },
  supplier: {
    [BalanceTypeEnum.BALANCED]: "تسویه شده (صفر)",
    [BalanceTypeEnum.DEBTOR]: "بدهکار به ما",
    [BalanceTypeEnum.CREDITOR]: "طلبکار (ما بدهکاریم)",
  },
};

/**
 * کارتِ «مانده‌ی اولیه» مشتری و تامین‌کننده: نوعِ حساب و مبلغ (`balanceType`،
 * `balanceAmount`)، و برای مشتری سقفِ اعتبار (`creditLimit`، فقط در کنترلرِ مشتری).
 *
 * @param {"customer"|"supplier"} side
 */
export default function PartyFinanceForm({ errors, balanceType, control, side }) {
  const balanceLabels = BALANCE_LABELS[side];
  const showAmount = balanceType !== BalanceTypeEnum.BALANCED;
  const options = [BalanceTypeEnum.BALANCED, BalanceTypeEnum.DEBTOR, BalanceTypeEnum.CREDITOR].map((value) => ({
    value,
    label: (
      <span className="flex items-center gap-2">
        {BALANCE_ICONS[value]}
        {balanceLabels[value]}
      </span>
    ),
  }));

  return (
    <FormSectionCard icon={Wallet} title="مانده‌ی اولیه (دستی)" contentClassName="px-6 py-5 space-y-4">
      <div className={`grid gap-4 ${showAmount ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        <FormSelectField name="balanceType" control={control} label="نوع حساب" options={options} />

        {showAmount && (
          <FormPriceField
            name="balanceAmount"
            control={control}
            label="مبلغ (ریال)"
            required
            rules={{ required: "وارد کردن مبلغ الزامی است" }}
            error={errors.balanceAmount}
            suffix
            inputClassName="text-base font-semibold"
            className="animate-in fade-in-50 slide-in-from-top-3 duration-300"
          />
        )}
      </div>

      {side === "customer" && (
        <FormPriceField name="creditLimit" control={control} label="سقف اعتبار (ریال)" icon={ShieldCheck} />
      )}
    </FormSectionCard>
  );
}
