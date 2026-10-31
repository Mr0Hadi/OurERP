import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSwitch from "@/shared/components/filters/FilterSwitch";
import { optionsFromLabels } from "@/shared/lib/options";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import {
  ACCOUNTING_PARTY_TYPE_LABELS,
  PARTY_BALANCE_STATE_LABELS,
} from "../../domain/accountingEnums";
import { usePartyBalanceFilterStore } from "../../store/accountingFilterStores";

const toPriceValue = (value) => (value === "" ? null : Number(value));

const PARTY_TYPE_OPTIONS = optionsFromLabels(ACCOUNTING_PARTY_TYPE_LABELS);
const BALANCE_STATE_OPTIONS = optionsFromLabels(PARTY_BALANCE_STATE_LABELS);

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
      dateRowClassName="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-border"
      resetWrapperClassName="flex items-end xs:col-span-2 lg:col-span-1 lg:justify-end"
      resetButtonClassName="w-full px-4"
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
      store={usePartyBalanceFilterStore}
      primary={
        <FilterSearchInput
          placeholder="نام یا تلفن..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      }
    >
      <FilterSelect label="نوع" value={partyType} onChange={setPartyType} options={PARTY_TYPE_OPTIONS} numeric />
      <FilterSelect label="مانده" value={balanceState} onChange={setBalanceState} options={BALANCE_STATE_OPTIONS} numeric />
      <FilterSwitch label="فقط سررسیدگذشته‌ها" checked={overdueOnly} onChange={setOverdueOnly} />
    </FilterPanel>
  );
}
