import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterMultiChoice from "@/shared/components/filters/FilterMultiChoice";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import PartyFilterSelect from "./PartyFilterSelect";
import UserFilterSelect from "./UserFilterSelect";
import { INVOICE_PAYMENT_STATE_LABELS, AccountingPartyTypeEnum, DocumentSideEnum } from "../../domain/accountingEnums";

const PAYMENT_STATE_OPTIONS = [
  { value: "", label: "همه" },
  ...Object.entries(INVOICE_PAYMENT_STATE_LABELS).map(([value, label]) => ({ value: Number(value), label })),
];

/**
 * فیلترهای دفترِ فروش/خرید. «وضعیتِ پرداخت» میان‌برِ پرکاربرد است (باز، سررسیدگذشته) و
 * بالای پنل می‌نشیند؛ بقیه همان نام‌های `GetSaleJournal`/`GetPurchaseJournal`اند.
 *
 * وضعیتِ خالی = همه‌ی فاکتورهای صادرشده (پیش‌فاکتور و لغوشده فقط با انتخابِ صریح می‌آیند).
 *
 * @param config   `JOURNAL_SIDES[side]`
 * @param useStore استورِ همان سمت (`INVOICE_JOURNAL_STORES`)
 */
export default function InvoiceJournalFilters({ config, useStore }) {
  const state = useStore();
  const capitalize = (key) => key.charAt(0).toUpperCase() + key.slice(1);
  const setParty = state[`set${capitalize(config.partyIdKey)}`];
  const setUser = state[`set${capitalize(config.userIdKey)}`];

  const partyType =
    config.side === DocumentSideEnum.SALE ? AccountingPartyTypeEnum.CUSTOMER : AccountingPartyTypeEnum.SUPPLIER;

  return (
    <div className="space-y-3">
      <StatusChoice
        label="وضعیتِ پرداخت"
        options={PAYMENT_STATE_OPTIONS}
        value={state.paymentState}
        onChange={state.setPaymentState}
        wrap
      />
      <FilterPanel
        onReset={state.resetFilters}
        dateRowClassName="grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-5"
        dateRow={
          <>
            <FilterDateInput label="سررسید از" value={state.fromDueDate} onChange={state.setFromDueDate} />
            <FilterDateInput label="سررسید تا" value={state.toDueDate} onChange={state.setToDueDate} />
            <div className="sm:col-span-2">
              <FilterMultiChoice
                label="وضعیتِ سند"
                options={toFilterOptions(config.statusLabels)}
                value={state.statuses}
                onChange={state.setStatuses}
                emptyHint="همه‌ی صادرشده‌ها (بدونِ پیش‌فاکتور و لغوشده)"
              />
            </div>
          </>
        }
      >
        <FilterSearchInput
          placeholder={`شماره فاکتور یا نامِ ${config.partyLabel}...`}
          value={state.search}
          onChange={(event) => state.setSearch(event.target.value)}
        />
        <PartyFilterSelect partyType={partyType} value={state[config.partyIdKey]} onSelect={setParty} />
        <UserFilterSelect label={config.userLabel} value={state[config.userIdKey]} onSelect={setUser} />
        <FilterSelect
          label="نوع پرداخت"
          value={state.paymentType}
          onChange={state.setPaymentType}
          options={toFilterOptions(config.paymentTypeLabels)}
          numeric
        />
      </FilterPanel>
    </div>
  );
}
