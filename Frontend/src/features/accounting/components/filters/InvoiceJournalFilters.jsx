import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterMultiSelect from "@/shared/components/filters/FilterMultiSelect";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { optionsFromLabels } from "@/shared/lib/options";
import UserFilterSelect from "@/features/employees/components/UserFilterSelect";
import { INVOICE_PAYMENT_STATE_LABELS, DocumentSideEnum } from "../../domain/accountingEnums";
import PartySelect from "@/features/partyAccount/components/PartySelect";

const PAYMENT_STATE_OPTIONS = optionsFromLabels(INVOICE_PAYMENT_STATE_LABELS, { numeric: true });

/**
 * فیلترهای دفترِ فروش/خرید، با همان نام‌های `GetSaleJournal`/`GetPurchaseJournal`. «وضعیتِ پرداخت» (باز،
 * سررسیدگذشته، …) و «وضعیتِ سند» در ردیفِ دوم‌اند.
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

  const partySide = config.side === DocumentSideEnum.SALE ? "customer" : "supplier";

  return (
    <FilterPanel
      onReset={state.resetFilters}
      dateRowClassName="grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-5"
      resetWrapperClassName="flex items-end lg:justify-end"
      dateRow={
        <>
          <FilterDateInput label="سررسید از" value={state.fromDueDate} onChange={state.setFromDueDate} />
          <FilterDateInput label="سررسید تا" value={state.toDueDate} onChange={state.setToDueDate} />
          <FilterSelect
            label="وضعیتِ پرداخت"
            value={state.paymentState}
            onChange={state.setPaymentState}
            options={PAYMENT_STATE_OPTIONS}
            numeric
          />
          {/* هیچ‌کدام = همه‌ی صادرشده‌ها (بدونِ پیش‌فاکتور و لغوشده). */}
          <FilterMultiSelect
            label="وضعیتِ سند"
            options={optionsFromLabels(config.statusLabels)}
            value={state.statuses}
            onChange={state.setStatuses}
            allLabel="همه‌ی صادرشده‌ها"
          />
        </>
      }
      store={useStore}
      primary={
        <FilterSearchInput
          placeholder={`شماره فاکتور یا نامِ ${config.partyLabel}...`}
          value={state.search}
          onChange={(event) => state.setSearch(event.target.value)}
        />
      }
    >
      <PartySelect side={partySide} value={state[config.partyIdKey]} onSelect={setParty} />
      <UserFilterSelect label={config.userLabel} value={state[config.userIdKey]} onSelect={setUser} />
      <FilterSelect
        label="نوع پرداخت"
        value={state.paymentType}
        onChange={state.setPaymentType}
        options={optionsFromLabels(config.paymentTypeLabels)}
        numeric
      />
    </FilterPanel>
  );
}
