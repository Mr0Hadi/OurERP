import FilterMultiChoice from "@/shared/components/filters/FilterMultiChoice";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSwitch from "@/shared/components/filters/FilterSwitch";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import {
  PARTY_LEDGER_DIRECTION_LABELS,
  PARTY_LEDGER_ENTRY_TYPE_LABELS,
} from "@/shared/domain/enums/partyLedger";
import PartyFilterSelect from "./PartyFilterSelect";
import { ACCOUNTING_PARTY_TYPE_LABELS, AccountingPartyTypeEnum } from "../../domain/accountingEnums";
import { usePartyLedgerFilterStore } from "../../store/accountingFilterStores";

const PARTY_TYPE_OPTIONS = toFilterOptions(ACCOUNTING_PARTY_TYPE_LABELS);
const DIRECTION_OPTIONS = toFilterOptions(PARTY_LEDGER_DIRECTION_LABELS);
const ENTRY_TYPE_OPTIONS = toFilterOptions(PARTY_LEDGER_ENTRY_TYPE_LABELS);

/**
 * فیلترهای دفترِ اشخاص. انتخابِ طرف‌حساب فقط بعد از انتخابِ نوع دیده می‌شود: دفتر یک
 * `customerId` و یک `supplierId` جدا دارد و فهرستِ مخلوطِ هر دو با نام‌های تکراری گیج‌کننده بود.
 */
export default function PartyLedgerFilters() {
  const {
    search,
    partyType,
    customerId,
    supplierId,
    direction,
    entryTypes,
    excludeReversed,
    setSearch,
    setPartyType,
    setCustomerId,
    setSupplierId,
    setDirection,
    setEntryTypes,
    setExcludeReversed,
    resetFilters,
  } = usePartyLedgerFilterStore();

  const isSupplier = partyType === AccountingPartyTypeEnum.SUPPLIER;

  return (
    <FilterPanel
      onReset={resetFilters}
      dateRowClassName="grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-5"
      dateRow={
        <>
          <div className="sm:col-span-2 lg:col-span-3">
            <FilterMultiChoice
              label="نوعِ ردیف"
              options={ENTRY_TYPE_OPTIONS}
              value={entryTypes}
              onChange={setEntryTypes}
              emptyHint="همه‌ی نوع‌ها"
            />
          </div>
          <div className="self-end">
            <FilterSwitch
              label="بدونِ برگشت‌خورده‌ها"
              hint="ردیفِ برگشت‌خورده و خودِ برگشت کنار می‌روند"
              checked={excludeReversed}
              onChange={setExcludeReversed}
            />
          </div>
        </>
      }
      store={usePartyLedgerFilterStore}
      primary={
        <FilterSearchInput
          placeholder="شرح، شماره فاکتور یا نام..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      }
    >
      <FilterSelect label="نوع طرف" value={partyType} onChange={setPartyType} options={PARTY_TYPE_OPTIONS} numeric />
      {partyType ? (
        <PartyFilterSelect
          partyType={partyType}
          value={isSupplier ? supplierId : customerId}
          onSelect={isSupplier ? setSupplierId : setCustomerId}
        />
      ) : (
        <p className="flex items-center rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          برای انتخابِ یک طرف‌حساب، اول نوعش را انتخاب کنید.
        </p>
      )}
      <FilterSelect label="جهت" value={direction} onChange={setDirection} options={DIRECTION_OPTIONS} numeric />
    </FilterPanel>
  );
}
