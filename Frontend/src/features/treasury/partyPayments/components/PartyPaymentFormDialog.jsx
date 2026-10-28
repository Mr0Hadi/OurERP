import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { PriceInput } from "@/shared/components/ui/price-input";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import FormField from "@/shared/components/forms/FormField";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import AmountInWords from "@/shared/components/forms/AmountInWords";
import BankAccountSelect from "@/shared/components/payments/BankAccountSelect";
import ChequeFields from "@/shared/components/payments/ChequeFields";
import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";
import { PAYMENT_REFERENCE_FIELDS, PAYMENT_TYPE_LABELS, PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { takesBankAccount } from "@/shared/domain/payments/paymentRows";
import { useAllocatableDocumentsQuery } from "../services/queries";
import { useAddPartyPaymentMutation } from "../services/mutations";
import AllocationEditor from "./AllocationEditor";
import {
  EMPTY_ALLOCATION_DRAFT,
  PARTY_KIND,
  PARTY_PAYMENT_TYPES,
  allocationErrors,
  directionLabel,
  emptyPartyPaymentDraft,
  hasAllocationErrors,
  naturalDirection,
  partyPaymentDraftErrors,
  toApiAllocations,
  toApiPartyPayment,
} from "../domain/partyPayment";
import PartySelect from "@/features/partyAccount/components/PartySelect";
import DialogActions from "@/shared/components/feedback/DialogActions";

const KIND_OPTIONS = [
  { value: PARTY_KIND.CUSTOMER, label: "مشتری" },
  { value: PARTY_KIND.SUPPLIER, label: "تامین‌کننده" },
];
const TYPE_OPTIONS = PARTY_PAYMENT_TYPES.map((type) => ({ value: type, label: PAYMENT_TYPE_LABELS[type] }));

function FormBody({ party, onClose, onSaved }) {
  const fixedParty = Boolean(party?.customerId || party?.supplierId);
  const [draft, setDraft] = useState(() => emptyPartyPaymentDraft(party));
  const [allocation, setAllocation] = useState(EMPTY_ALLOCATION_DRAFT);
  const [showErrors, setShowErrors] = useState(false);
  const mutation = useAddPartyPaymentMutation();

  const isSupplier = draft.partyKind === PARTY_KIND.SUPPLIER;

  // فقط جهتِ طبیعی تخصیص می‌گیرد (برگرداندنِ بستانکاری هرگز).
  const canAllocate = Boolean(draft.partyId) && draft.direction === naturalDirection(draft.partyKind);
  const partyFilter = isSupplier ? { supplierId: draft.partyId } : { customerId: draft.partyId };
  const documentsQuery = useAllocatableDocumentsQuery(partyFilter, { enabled: canAllocate });
  const documents = canAllocate ? (documentsQuery.data ?? []) : [];

  const errors = partyPaymentDraftErrors(draft);
  const allocErrors = allocationErrors(documents, allocation, draft.amount);
  const errorOf = (field) => (showErrors && errors[field] ? { message: errors[field] } : undefined);
  const patch = (next) => setDraft((current) => ({ ...current, ...next }));
  const reference = PAYMENT_REFERENCE_FIELDS[draft.type];

  const changeKind = (partyKind) => {
    setDraft((current) => ({ ...current, partyKind, partyId: null, direction: naturalDirection(partyKind) }));
    setAllocation(EMPTY_ALLOCATION_DRAFT);
  };

  const submit = (event) => {
    event.preventDefault();
    if (Object.keys(errors).length > 0 || hasAllocationErrors(allocErrors)) return setShowErrors(true);
    const body = toApiPartyPayment(draft, canAllocate ? toApiAllocations(documents, allocation) : []);
    mutation.mutate(body, {
      onSuccess: (saved) => {
        onSaved?.(saved);
        onClose();
      },
    });
  };

  const directionOptions = [naturalDirection(draft.partyKind), naturalDirection(draft.partyKind) === PaymentDirectionEnum.IN ? PaymentDirectionEnum.OUT : PaymentDirectionEnum.IN].map(
    (direction) => ({ value: direction, label: directionLabel(draft.partyKind, direction) }),
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>دریافت / پرداختِ علی‌الحساب</DialogTitle>
        <DialogDescription>
          پولِ بی فاکتور: همان لحظه مانده‌ی حسابِ شخص و صندوق/بانک را عوض می‌کند. می‌شود همین حالا یا بعداً بخشی از آن را به فاکتورهای باز زد.
        </DialogDescription>
      </DialogHeader>

      <fieldset disabled={mutation.isPending} className="@container/partypay min-w-0 space-y-3">
        {!fixedParty && (
          <>
            <StatusChoice label="طرف حساب" options={KIND_OPTIONS} value={draft.partyKind} onChange={changeKind} />
            <FormField label={isSupplier ? "تامین‌کننده" : "مشتری"} required error={errorOf("partyId")}>
              <PartySelect
                side={isSupplier ? "supplier" : "customer"}
                label={null}
                value={draft.partyId}
                onSelect={(id) => {
                  patch({ partyId: id === "" ? null : id });
                  setAllocation(EMPTY_ALLOCATION_DRAFT);
                }}
                allowClear={false}
              />
            </FormField>
          </>
        )}

        <StatusChoice label="جهت" options={directionOptions} value={draft.direction} onChange={(direction) => patch({ direction })} />
        <StatusChoice label="روش" options={TYPE_OPTIONS} value={draft.type} onChange={(type) => patch({ type })} />

        <FormField label="مبلغ (ریال)" htmlFor="party-pay-amount" required error={errorOf("amount")}>
          <PriceInput id="party-pay-amount" min={0} value={draft.amount} onValueChange={(amount) => patch({ amount })} className="h-9" />
          <AmountInWords rial={draft.amount} />
        </FormField>

        <div className="grid gap-3 @md/partypay:grid-cols-2">
          <FormField label="تاریخ" htmlFor="party-pay-date">
            <PersianDatePicker
              id="party-pay-date"
              value={draft.paidAt}
              onChange={(isoDate) => patch({ paidAt: isoDate || "" })}
              placeholder="امروز"
            />
          </FormField>
          {reference && (
            <FormField label={reference.label} htmlFor="party-pay-reference">
              <Input
                id="party-pay-reference"
                dir="ltr"
                value={draft[reference.field]}
                onChange={(e) => patch({ [reference.field]: e.target.value })}
                className="h-9"
              />
            </FormField>
          )}
          {draft.type === PaymentTypeEnum.CHECK && (
            <ChequeFields value={draft} onChange={patch} idPrefix="party-pay-cheque" />
          )}
          {takesBankAccount(draft.type) && (
            <FormField label="صندوق / حساب" htmlFor="party-pay-account">
              <BankAccountSelect
                id="party-pay-account"
                value={draft.bankAccountId}
                onChange={(bankAccountId) => patch({ bankAccountId })}
                paymentType={draft.type}
              />
            </FormField>
          )}
        </div>

        <FormField label="شرح" htmlFor="party-pay-description" error={errorOf("description")}>
          <Textarea
            id="party-pay-description"
            rows={2}
            maxLength={500}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="مثلاً علی‌الحساب"
          />
        </FormField>

        {canAllocate && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-medium">تخصیص به فاکتورها (اختیاری)</p>
            <AllocationEditor
              documents={documents}
              draft={allocation}
              onChange={setAllocation}
              available={draft.amount}
              errors={showErrors ? allocErrors : { rows: {}, total: null }}
              isLoading={documentsQuery.isLoading}
            />
          </div>
        )}
      </fieldset>

      <DialogActions onCancel={onClose} isPending={mutation.isPending} submitLabel="ثبت" />
    </form>
  );
}

/**
 * ثبتِ دریافت/پرداختِ علی‌الحساب (`AddPartyPayment`، دسترسیِ `PartyPaymentCreate`)، با تخصیصِ اختیاری در همان
 * درخواست. کارتخوان اینجا نیست.
 *
 * @param party   `{ customerId }` یا `{ supplierId }` برای طرفِ ثابت (صفحه‌ی مشتری/تامین‌کننده)؛ خالی = انتخاب در فرم
 * @param onSaved `(payment) => void` — `PartyPaymentDto`ِ ثبت‌شده
 */
export default function PartyPaymentFormDialog({ open, onOpenChange, party, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        {open && <FormBody party={party} onClose={() => onOpenChange(false)} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}
