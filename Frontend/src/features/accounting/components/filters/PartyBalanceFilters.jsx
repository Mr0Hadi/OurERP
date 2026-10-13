import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSwitch from "@/shared/components/filters/FilterSwitch";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import {
  ACCOUNTING_PARTY_TYPE_LABELS,
  PARTY_BALANCE_STATE_LABELS,
} from "../../domain/accountingEnums";
import { usePartyBalanceFilterStore } from "../../store/accountingFilterStores";

const toPriceValue = (value) => (value === "" ? null : Number(value));

const PARTY_TYPE_OPTIONS = toFilterOptions(ACCOUNTING_PARTY_TYPE_LABELS);
const BALANCE_STATE_OPTIONS = toFilterOptions(PARTY_BALANCE_STATE_LABELS);

/**
 * فیلترهای جدولِ حسابِ اشخاص — همه با نامِ پارامترِ `GetPartyBalanceList`. بازه‌ی مانده
 * علامت‌دار است (منفی = بستانکار)، پس `PriceInput` بی `min` است تا منفی را بپذیرد.
 */
export default function PartyBalanceFilters() {
  const {
    search,
    partyType,
    balanceState,
    minBalance,
    maxBalance,
    overdueOnly,
    setSearch,
    setPartyType,
    setBalanceState,
    setMinBalance,
    setMaxBalance,
    setOverdueOnly,
    resetFilters,
  } = usePartyBalanceFilterStore();

  return (
    <FilterPanel
      onReset={resetFilters}
      dateRow={
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Label className="whitespace-nowrap text-sm font-medium">مانده از</Label>
            <PriceInput
              value={toPriceValue(minBalance)}
              onValueChange={(next) => setMinBalance(next ?? "")}
              placeholder="ریال"
              className="flex-1"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Label className="whitespace-nowrap text-sm font-medium">مانده تا</Label>
            <PriceInput
              value={toPriceValue(maxBalance)}
              onValueChange={(next) => setMaxBalance(next ?? "")}
              placeholder="ریال"
              className="flex-1"
            />
          </div>
        </>
      }
    >
      <FilterSearchInput
        placeholder="نام یا تلفن..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <FilterSelect label="نوع" value={partyType} onChange={setPartyType} options={PARTY_TYPE_OPTIONS} numeric />
      <FilterSelect label="مانده" value={balanceState} onChange={setBalanceState} options={BALANCE_STATE_OPTIONS} numeric />
      <FilterSwitch label="فقط سررسیدگذشته‌ها" checked={overdueOnly} onChange={setOverdueOnly} />
    </FilterPanel>
  );
}
