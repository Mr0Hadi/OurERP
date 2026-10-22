import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { PriceInput } from "@/shared/components/ui/price-input";
import { CardNumberInput, ShabaInput } from "@/shared/components/ui/bank-input";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import FormField from "@/shared/components/forms/FormField";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import { BANK_ACCOUNT_KIND_LABELS, BankAccountKindEnum } from "@/shared/domain/enums/bankAccount";
import { useCreateBankAccountMutation, useUpdateBankAccountMutation } from "../services/mutations";
import {
  bankAccountDraftErrors,
  bankAccountDraftOf,
  emptyBankAccountDraft,
  toApiBankAccount,
} from "../domain/bankAccountForm";

const KIND_OPTIONS = Object.values(BankAccountKindEnum).map((value) => ({
  value,
  label: BANK_ACCOUNT_KIND_LABELS[value],
}));

/** بدنه‌ی فرم — با `key` روی هر بازشدن از نو mount می‌شود تا پیش‌نویسِ قبلی نماند. */
function FormBody({ account, onClose, onSaved }) {
  const isEdit = Boolean(account);
  const [draft, setDraft] = useState(() => (isEdit ? bankAccountDraftOf(account) : emptyBankAccountDraft()));
  const [showErrors, setShowErrors] = useState(false);
  const create = useCreateBankAccountMutation();
  const update = useUpdateBankAccountMutation();
  const isPending = create.isPending || update.isPending;

  const errors = bankAccountDraftErrors(draft);
  const errorOf = (field) => (showErrors && errors[field] ? { message: errors[field] } : undefined);
  const patch = (next) => setDraft((current) => ({ ...current, ...next }));
  const isBank = draft.kind === BankAccountKindEnum.BANK;
  // نامِ بانک از روی شبا/کارت پر می‌شود، مگر کاربر خودش نوشته باشد.
  const suggestBank = (bank) => bank && !draft.bankName.trim() && patch({ bankName: bank.name });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (Object.keys(errors).length > 0) return setShowErrors(true);
    const done = (saved) => {
      onSaved?.(saved);
      onClose();
    };
    if (isEdit) update.mutate(toApiBankAccount(draft, account.id), { onSuccess: done });
    else create.mutate(toApiBankAccount(draft), { onSuccess: done });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{isEdit ? `ویرایشِ «${account.title}»` : "صندوق یا حسابِ تازه"}</DialogTitle>
        <DialogDescription>
          مانده ذخیره نمی‌شود و همیشه از مانده‌ی اول دوره و گردش‌ها حساب می‌شود؛ تغییرِ مانده‌ی اول دوره همه‌ی مانده‌های بعدی را جابه‌جا می‌کند.
        </DialogDescription>
      </DialogHeader>

      <fieldset disabled={isPending} className="@container/bankform min-w-0 space-y-3">
        <StatusChoice
          label="نوع"
          options={KIND_OPTIONS}
          value={draft.kind}
          onChange={(kind) => patch({ kind })}
        />
        {isEdit && (
          <p className="-mt-1 text-xs text-muted-foreground">نوعِ حسابی که گردش دارد عوض نمی‌شود.</p>
        )}

        <FormField label="عنوان" htmlFor="bank-title" required error={errorOf("title")}>
          <Input
            id="bank-title"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={isBank ? "مثلاً بانک ملت - جاری" : "مثلاً صندوقِ فروشگاه"}
            maxLength={100}
            autoFocus
          />
        </FormField>

        {isBank && (
          <div className="grid gap-3 @md/bankform:grid-cols-2">
            <FormField label="شماره شبا" htmlFor="bank-iban" error={errorOf("iban")} className="space-y-1.5 @md/bankform:col-span-2">
              <ShabaInput
                id="bank-iban"
                value={draft.iban}
                onValueChange={(iban) => patch({ iban })}
                onBankChange={suggestBank}
              />
            </FormField>
            <FormField label="شماره کارت" htmlFor="bank-card" error={errorOf("cardNumber")}>
              <CardNumberInput
                id="bank-card"
                value={draft.cardNumber}
                onValueChange={(cardNumber) => patch({ cardNumber })}
                onBankChange={suggestBank}
              />
            </FormField>
            <FormField label="شماره حساب" htmlFor="bank-account-number" error={errorOf("accountNumber")}>
              <Input
                id="bank-account-number"
                dir="ltr"
                value={draft.accountNumber}
                onChange={(e) => patch({ accountNumber: e.target.value })}
                maxLength={50}
                className="h-10"
              />
            </FormField>
            <FormField label="نام بانک" htmlFor="bank-name" error={errorOf("bankName")} className="space-y-1.5 @md/bankform:col-span-2">
              <Input
                id="bank-name"
                value={draft.bankName}
                onChange={(e) => patch({ bankName: e.target.value })}
                maxLength={100}
              />
            </FormField>
          </div>
        )}

        <div className="grid gap-3 @md/bankform:grid-cols-2">
          <FormField
            label="مانده‌ی اول دوره (ریال)"
            htmlFor="bank-opening"
            error={errorOf("openingBalance")}
            hint="آنچه هنگامِ شروع در این حساب بود"
          >
            <PriceInput
              id="bank-opening"
              min={0}
              value={draft.openingBalance}
              onValueChange={(openingBalance) => patch({ openingBalance })}
            />
          </FormField>
          <FormField label="تاریخِ مانده‌ی اول دوره" htmlFor="bank-opening-date">
            <PersianDatePicker
              id="bank-opening-date"
              value={draft.openingDate}
              onChange={(isoDate) => patch({ openingDate: isoDate || "" })}
              placeholder="امروز"
            />
          </FormField>
        </div>

        <FormField label="توضیح" htmlFor="bank-description" error={errorOf("description")}>
          <Textarea
            id="bank-description"
            rows={2}
            maxLength={500}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </FormField>
      </fieldset>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          انصراف
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ثبت..." : isEdit ? "ذخیره" : "افزودن"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * افزودن/ویرایشِ صندوق یا حسابِ بانکی (`CreateBankAccount`/`UpdateBankAccount`، دسترسیِ `BankAccountManage`).
 * فیلدهای بانکی فقط برای «حساب بانکی» است؛ سرور برای صندوق ذخیره‌شان نمی‌کند.
 *
 * @param account  حسابِ سرور برای ویرایش؛ خالی = افزودن
 * @param onSaved  `(account) => void` — حسابِ ذخیره‌شده (مثلاً برای رفتن به صفحه‌اش)
 */
export default function BankAccountFormDialog({ open, onOpenChange, account, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {open && (
          <FormBody key={account?.id ?? "new"} account={account} onClose={() => onOpenChange(false)} onSaved={onSaved} />
        )}
      </DialogContent>
    </Dialog>
  );
}
