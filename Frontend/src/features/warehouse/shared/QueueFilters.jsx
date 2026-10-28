import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { Label } from "@/shared/components/ui/label";
import { parseQueueFilter } from "./queueFilters";
import OptionSelect from "@/shared/components/forms/OptionSelect";
import PartySelect from "@/features/partyAccount/components/PartySelect";

/**
 * فیلترهای صفِ دریافت یا ارسال: شماره‌ی فاکتور، طرفِ حساب، وضعیت و بازه‌ی تاریخ.
 *
 * وضعیت گزینه‌ی «همه» ندارد — پیش‌نویس و لغوشده جایی در صفِ انبار ندارند.
 * پیش‌فرض «در انتظار» است (`QUEUE_FILTER.AWAITING`).
 *
 * @param {object} props
 * @param {Function} props.useStore استورِ فیلترِ صف (`createFilterStore`)
 * @param {object} props.party `{ key, side }` — `key` نامِ فیلترِ سرور (`supplierId`/`customerId`)،
 *   `side` نوعِ `PartySelect`
 * @param {{ value, label }[]} props.statusOptions
 * @param {string} props.searchPlaceholder
 */
export default function QueueFilters({ useStore, party, statusOptions, searchPlaceholder }) {
  const store = useStore();
  const setParty = store[`set${party.key[0].toUpperCase()}${party.key.slice(1)}`];

  return (
    <FilterPanel
      onReset={store.resetFilters}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      dateRow={
        <>
          <FilterDateInput label="از تاریخ" value={store.fromDate} onChange={store.setFromDate} />
          <FilterDateInput label="تا تاریخ" value={store.toDate} onChange={store.setToDate} />
        </>
      }
      store={useStore}
      primary={
        <FilterSearchInput
          placeholder={searchPlaceholder}
          value={store.invoiceNumber}
          onChange={(event) => store.setInvoiceNumber(event.target.value)}
        />
      }
    >
      <PartySelect side={party.side} value={store[party.key]} onSelect={setParty} />

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Label className="whitespace-nowrap font-medium text-foreground text-sm">وضعیت</Label>
        <OptionSelect
          value={store.status}
          onChange={(value) => store.setStatus(parseQueueFilter(value))}
          options={statusOptions}
          className="flex-1 w-full"
        />
      </div>
    </FilterPanel>
  );
}
