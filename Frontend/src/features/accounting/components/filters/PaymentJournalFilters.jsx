import FilterMultiSelect from "@/shared/components/filters/FilterMultiSelect";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSwitch from "@/shared/components/filters/FilterSwitch";
import { optionsFromLabels } from "@/shared/lib/options";
import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";
import { PAYMENT_TYPE_LABELS, PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import UserFilterSelect from "@/features/employees/components/UserFilterSelect";
import {
  DOCUMENT_SIDE_LABELS,
  DocumentSideEnum,
} from "../../domain/accountingEnums";
import { PAYMENT_PURPOSE_FILTER_LABELS } from "../../domain/paymentPurpose";
import { usePaymentJournalFilterStore } from "../../store/accountingFilterStores";
import PartySelect from "@/features/partyAccount/components/PartySelect";

const DIRECTION_OPTIONS = [
  { value: PaymentDirectionEnum.IN, label: "دریافت" },
  { value: PaymentDirectionEnum.OUT, label: "پرداخت" },
];

// «ترکیبی» و «نسیه» روشِ یک *ردیفِ* پرداخت نیستند (ظرف‌اند یا یعنی «پولی جابه‌جا نشد»).
const TYPE_OPTIONS = [PaymentTypeEnum.CASH, PaymentTypeEnum.CHECK, PaymentTypeEnum.TRANSFER, PaymentTypeEnum.INSTALLMENT].map(
  (value) => ({ value, label: PAYMENT_TYPE_LABELS[value] }),
);

const SIDE_OPTIONS = optionsFromLabels(DOCUMENT_SIDE_LABELS);
const PURPOSE_OPTIONS = optionsFromLabels(PAYMENT_PURPOSE_FILTER_LABELS);

/**
 * فیلترهای دفترِ دریافت و پرداخت (`GetPaymentJournal`). طرف‌حساب بعد از انتخابِ «سند»
 * (فروش/خرید) دیده می‌شود، چون فروش فقط مشتری دارد و خرید فقط تامین‌کننده.
 */
export default function PaymentJournalFilters() {
  const state = usePaymentJournalFilterStore();
  const side = state.documentSide;

  return (
    <FilterPanel
      onReset={state.resetFilters}
      dateRowClassName="grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-5"
      resetWrapperClassName="flex items-end lg:justify-end"
      dateRow={
        <>
          <FilterSelect label="جهت" value={state.direction} onChange={state.setDirection} options={DIRECTION_OPTIONS} numeric />
          <FilterMultiSelect
            label="روش"
            options={TYPE_OPTIONS}
            value={state.types}
            onChange={state.setTypes}
            allLabel="همه‌ی روش‌ها"
          />
          <UserFilterSelect label="ثبت‌کننده" value={state.recordedByUserId} onSelect={state.setRecordedByUserId} />
          <FilterSwitch label="باطل‌شده‌ها هم" checked={state.includeVoided} onChange={state.setIncludeVoided} />
        </>
      }
      store={usePaymentJournalFilterStore}
      primary={
        <FilterSearchInput
          placeholder="فاکتور، نام، شماره چک یا پیگیری..."
          value={state.search}
          onChange={(event) => state.setSearch(event.target.value)}
        />
      }
    >
      <FilterSelect label="سند" value={side} onChange={state.setDocumentSide} options={SIDE_OPTIONS} numeric />
      {side === DocumentSideEnum.SALE || side === DocumentSideEnum.PURCHASE ? (
        <PartySelect
          side={side === DocumentSideEnum.SALE ? "customer" : "supplier"}
          value={side === DocumentSideEnum.SALE ? state.customerId : state.supplierId}
          onSelect={side === DocumentSideEnum.SALE ? state.setCustomerId : state.setSupplierId}
        />
      ) : (
        <p className="flex items-center rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          برای انتخابِ طرف‌حساب، اول سند (فروش یا خرید) را انتخاب کنید.
        </p>
      )}
      <FilterSelect label="نوع" value={state.purpose} onChange={state.setPurpose} options={PURPOSE_OPTIONS} numeric />
    </FilterPanel>
  );
}
