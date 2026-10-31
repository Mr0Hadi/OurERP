import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import FormField from "@/shared/components/forms/FormField";
import Notice from "@/shared/components/feedback/Notice";
import BankAccountSelect from "@/shared/components/payments/BankAccountSelect";
import { PaymentDirectionEnum, PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import { useAllocatableDocumentsQuery } from "../../partyPayments/services/queries";
import { useBounceChequeMutation, useCashChequeMutation, useEndorseChequeMutation } from "../services/mutations";
import { CHEQUE_DIRECTION_LABELS, cashNeedsAccount, isEndorsedOut } from "../domain/cheque";
import OptionSelect from "@/shared/components/forms/OptionSelect";
import PartySelect from "@/features/partyAccount/components/PartySelect";
import DialogActions from "@/shared/components/feedback/DialogActions";

const TITLES = { cash: "وصولِ چک", bounce: "برگشتِ چک", endorse: "خرجِ چک به تامین‌کننده" };

/** آنچه برگشت با این چک می‌کند، بسته به اینکه بابتِ چه بود. */
function bounceEffect(cheque) {
  if (isEndorsedOut(cheque)) return "چکِ اصلیِ مشتری هم برگشتی می‌شود: مشتری دوباره بدهکار و تامین‌کننده دوباره بستانکار.";
  if (Number(cheque.purpose) === PaymentPurposeEnum.INSTALLMENT)
    return "قسط‌هایی که با آن پرداخت شده دوباره پرداخت‌نشده می‌شوند و تخفیفِ تسویه‌ای که گرفته بودند برمی‌گردد.";
  if (cheque.isOnAccount) return "دریافت/پرداختِ علی‌الحساب برمی‌گردد و تخصیص‌هایش حذف می‌شوند.";
  return "پرداختِ فاکتور برمی‌گردد و فاکتور دوباره بدهکار می‌شود (فاکتورِ صادرشده صادرشده می‌ماند).";
}

function CashBody({ cheque, form, patch }) {
  const needsAccount = cashNeedsAccount(cheque);
  return (
    <>
      {isEndorsedOut(cheque) ? (
        <Notice tone="info">این چک خرج شده و تامین‌کننده وصولش می‌کند؛ هیچ حسابی از ما تکان نمی‌خورد.</Notice>
      ) : (
        <FormField
          label={cheque.direction === PaymentDirectionEnum.IN ? "واریز به" : "پاس‌شده از"}
          htmlFor="cheque-cash-account"
          required={needsAccount}
          hint={!needsAccount ? `خالی = ${cheque.bankAccountTitle}` : undefined}
        >
          <BankAccountSelect
            id="cheque-cash-account"
            value={form.bankAccountId}
            onChange={(bankAccountId) => patch({ bankAccountId })}
            paymentType={PaymentTypeEnum.TRANSFER}
          />
        </FormField>
      )}
      <FormField label="تاریخِ وصول" htmlFor="cheque-cash-date" hint="مانده‌ی حساب در همین تاریخ عوض می‌شود">
        <PersianDatePicker id="cheque-cash-date" value={form.date} onChange={(date) => patch({ date: date || "" })} placeholder="اکنون" />
      </FormField>
    </>
  );
}

function BounceBody({ cheque, form, patch }) {
  return (
    <>
      <Notice tone="warning">{bounceEffect(cheque)} برگشت نهایی است.</Notice>
      <FormField label="تاریخِ برگشت" htmlFor="cheque-bounce-date">
        <PersianDatePicker id="cheque-bounce-date" value={form.date} onChange={(date) => patch({ date: date || "" })} placeholder="اکنون" />
      </FormField>
      <FormField label="دلیل" htmlFor="cheque-bounce-note">
        <Textarea
          id="cheque-bounce-note"
          rows={2}
          maxLength={500}
          value={form.note}
          onChange={(e) => patch({ note: e.target.value })}
          placeholder="مثلاً کسری موجودی"
        />
      </FormField>
    </>
  );
}

function EndorseBody({ form, patch }) {
  const purchasesQuery = useAllocatableDocumentsQuery({ supplierId: form.supplierId }, { enabled: Boolean(form.supplierId) });
  const purchases = purchasesQuery.data ?? [];

  return (
    <>
      <FormField label="تامین‌کننده" required>
        <PartySelect
          side="supplier"
          label={null}
          value={form.supplierId}
          onSelect={(id) => patch({ supplierId: id === "" ? null : id, purchaseId: null })}
          allowClear={false}
        />
      </FormField>
      {form.supplierId && (
        <FormField label="بابتِ" htmlFor="cheque-endorse-purchase" hint="خریدِ بازِ همین تامین‌کننده، یا علی‌الحساب">
          <OptionSelect
            id="cheque-endorse-purchase"
            dir="rtl"
            value={form.purchaseId}
            onChange={(purchaseId) => patch({ purchaseId })}
            numeric
            emptyLabel="علی‌الحسابِ تامین‌کننده"
            emptyValue={null}
            isLoading={purchasesQuery.isLoading}
            className="h-9 w-full"
            options={purchases.map((doc) => ({
              value: doc.purchaseId,
              label: (
                <>
                  {doc.invoiceNumber || `خرید #${doc.purchaseId}`}
                  <span className="text-xs text-muted-foreground"> · مانده {formatNumber(doc.remainingAmount)}</span>
                </>
              ),
            }))}
          />
        </FormField>
      )}
      <FormField label="تاریخ" htmlFor="cheque-endorse-date">
        <PersianDatePicker id="cheque-endorse-date" value={form.date} onChange={(date) => patch({ date: date || "" })} placeholder="اکنون" />
      </FormField>
      <FormField label="شرح" htmlFor="cheque-endorse-description">
        <Textarea
          id="cheque-endorse-description"
          rows={2}
          maxLength={500}
          value={form.note}
          onChange={(e) => patch({ note: e.target.value })}
        />
      </FormField>
    </>
  );
}

function ActionBody({ kind, cheque, onClose }) {
  const [form, setForm] = useState({ bankAccountId: null, date: "", note: "", supplierId: null, purchaseId: null });
  const patch = (next) => setForm((current) => ({ ...current, ...next }));
  const cash = useCashChequeMutation();
  const bounce = useBounceChequeMutation();
  const endorse = useEndorseChequeMutation();
  const mutation = { cash, bounce, endorse }[kind];

  const ready =
    kind === "cash" ? !(cashNeedsAccount(cheque) && !form.bankAccountId) : kind === "endorse" ? Boolean(form.supplierId) : true;

  const submit = () => {
    const base = { paymentDetailId: cheque.id };
    const done = { onSuccess: onClose };
    if (kind === "cash") cash.mutate({ ...base, bankAccountId: form.bankAccountId, cashedAt: form.date || null }, done);
    else if (kind === "bounce") bounce.mutate({ ...base, bouncedAt: form.date || null, note: form.note.trim() || null }, done);
    else
      endorse.mutate(
        {
          ...base,
          supplierId: form.supplierId,
          purchaseId: form.purchaseId,
          endorsedAt: form.date || null,
          description: form.note.trim() || null,
        },
        done,
      );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{TITLES[kind]}</DialogTitle>
        <DialogDescription>
          چکِ {CHEQUE_DIRECTION_LABELS[cheque.direction]} {cheque.checkNumber && `شماره‌ی ${cheque.checkNumber}`} — {formatRial(cheque.amount)}
          {cheque.checkDueDate && `، سررسید ${gregorianToPersian(cheque.checkDueDate)}`}
          {cheque.partyName && `، ${cheque.partyName}`}
        </DialogDescription>
      </DialogHeader>
      <fieldset disabled={mutation.isPending} className="min-w-0 space-y-3">
        {kind === "cash" && <CashBody cheque={cheque} form={form} patch={patch} />}
        {kind === "bounce" && <BounceBody cheque={cheque} form={form} patch={patch} />}
        {kind === "endorse" && <EndorseBody form={form} patch={patch} />}
      </fieldset>
      <DialogActions
        onCancel={onClose}
        onSubmit={submit}
        isPending={mutation.isPending}
        disabled={!ready}
        variant={kind === "bounce" ? "destructive" : "default"}
        submitLabel={TITLES[kind]}
      />
    </>
  );
}

/**
 * سرنوشتِ یک چکِ در جریان: وصول (`CashCheck`)، برگشت (`BounceCheck`) یا خرج به تامین‌کننده (`EndorseCheck`). دسترسیِ
 * `CheckManage`.
 *
 * @param target `{ kind: "cash"|"bounce"|"endorse", cheque }` یا `null` = بسته
 */
export default function ChequeActionDialog({ target, onOpenChange }) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {target && (
          <ActionBody
            key={`${target.kind}-${target.cheque.id}`}
            kind={target.kind}
            cheque={target.cheque}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
