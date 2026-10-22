import { useState } from "react";
import { ArrowDown } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import FormField from "@/shared/components/forms/FormField";
import { BANK_ACCOUNT_KIND_LABELS } from "@/shared/domain/enums/bankAccount";
import { formatNumber } from "@/shared/lib/numberFormat";
import { useTransferBetweenAccountsMutation } from "../services/mutations";
import { emptyTransferDraft, toApiTransfer, transferDraftErrors } from "../domain/bankAccountForm";

/** انتخابگرِ حساب؛ Select رشته می‌دهد و شناسه‌ها عددند. */
function AccountSelect({ id, accounts, value, onChange, exclude }) {
  return (
    <Select dir="rtl" value={value ? String(value) : ""} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger id={id} className="h-10 w-full">
        <SelectValue placeholder="انتخاب کنید" />
      </SelectTrigger>
      <SelectContent>
        {accounts
          .filter((account) => account.id !== exclude)
          .map((account) => (
            <SelectItem key={account.id} value={String(account.id)}>
              {account.title}
              <span className="text-xs text-muted-foreground">
                {" · "}
                {BANK_ACCOUNT_KIND_LABELS[account.kind]} · مانده {formatNumber(account.balance)}
              </span>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

function TransferBody({ accounts, fromBankAccountId, onClose }) {
  const [draft, setDraft] = useState(() => emptyTransferDraft(fromBankAccountId));
  const [showErrors, setShowErrors] = useState(false);
  const mutation = useTransferBetweenAccountsMutation();
  const errors = transferDraftErrors(draft);
  const errorOf = (field) => (showErrors && errors[field] ? { message: errors[field] } : undefined);
  const patch = (next) => setDraft((current) => ({ ...current, ...next }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (Object.keys(errors).length > 0) return setShowErrors(true);
    mutation.mutate(toApiTransfer(draft), { onSuccess: onClose });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>انتقال بین حساب‌ها</DialogTitle>
        <DialogDescription>
          جابه‌جاییِ پول بین صندوق‌ها و حساب‌های خودمان (مثلاً واریزِ صندوق به بانک). پرداخت نیست و حسابِ هیچ شخصی را عوض نمی‌کند.
        </DialogDescription>
      </DialogHeader>

      <fieldset disabled={mutation.isPending} className="min-w-0 space-y-3">
        <FormField label="از حساب" htmlFor="transfer-from" required error={errorOf("fromBankAccountId")}>
          <AccountSelect
            id="transfer-from"
            accounts={accounts}
            value={draft.fromBankAccountId}
            onChange={(fromBankAccountId) => patch({ fromBankAccountId })}
          />
        </FormField>
        <ArrowDown className="mx-auto size-4 text-muted-foreground" aria-hidden="true" />
        <FormField label="به حساب" htmlFor="transfer-to" required error={errorOf("toBankAccountId")}>
          <AccountSelect
            id="transfer-to"
            accounts={accounts}
            value={draft.toBankAccountId}
            onChange={(toBankAccountId) => patch({ toBankAccountId })}
            exclude={draft.fromBankAccountId}
          />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="مبلغ (ریال)" htmlFor="transfer-amount" required error={errorOf("amount")}>
            <PriceInput id="transfer-amount" min={0} value={draft.amount} onValueChange={(amount) => patch({ amount })} />
          </FormField>
          <FormField label="تاریخ" htmlFor="transfer-date">
            <PersianDatePicker
              id="transfer-date"
              value={draft.transferredAt}
              onChange={(isoDate) => patch({ transferredAt: isoDate || "" })}
              placeholder="اکنون"
            />
          </FormField>
        </div>
        <FormField label="شماره پیگیری" htmlFor="transfer-ref" error={errorOf("transferRef")}>
          <Input
            id="transfer-ref"
            dir="ltr"
            value={draft.transferRef}
            onChange={(e) => patch({ transferRef: e.target.value })}
            maxLength={64}
          />
        </FormField>
        <FormField label="توضیح" htmlFor="transfer-description" error={errorOf("description")}>
          <Textarea
            id="transfer-description"
            rows={2}
            maxLength={500}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </FormField>
      </fieldset>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          انصراف
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "در حال ثبت..." : "ثبتِ انتقال"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * انتقال بین دو حسابِ فعالِ خودمان (`TransferBetweenAccounts`، دسترسیِ `BankAccountManage`). ویرایش ندارد؛
 * انتقالِ اشتباه از گردشِ حساب ابطال و دوباره ثبت می‌شود.
 *
 * @param accounts          حساب‌های فعال (با `balance`) از `useBankAccountsQuery`
 * @param fromBankAccountId پیش‌فرضِ «از حساب» — حسابِ بازِ صفحه
 */
export default function BankTransferDialog({ open, onOpenChange, accounts, fromBankAccountId }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {open && <TransferBody accounts={accounts} fromBankAccountId={fromBankAccountId} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
