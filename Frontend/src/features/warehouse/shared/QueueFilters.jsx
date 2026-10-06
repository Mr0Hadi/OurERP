import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { parseQueueFilter } from "./queueFilters";

/**
 * فیلترهای صفِ دریافت یا ارسال: شماره‌ی فاکتور، طرفِ حساب، وضعیت و بازه‌ی تاریخ.
 *
 * وضعیت گزینه‌ی «همه» ندارد — پیش‌نویس و لغوشده جایی در صفِ انبار ندارند.
 * پیش‌فرض «در انتظار» است (`QUEUE_FILTER.AWAITING`).
 *
 * @param {object} props
 * @param {Function} props.useStore استورِ فیلترِ صف (`createFilterStore`)
 * @param {object} props.party `{ key, label, emptyText, items, isLoading, phoneOf }` —
 *   `key` نامِ فیلترِ سرور (`supplierId`/`customerId`)
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
      dateRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-border"
      resetWrapperClassName="flex items-end sm:col-span-2 lg:col-span-2 lg:justify-end"
      resetButtonClassName="w-full lg:w-auto px-4"
      dateRow={
        <>
          <FilterDateInput label="از تاریخ" value={store.fromDate} onChange={store.setFromDate} />
          <FilterDateInput label="تا تاریخ" value={store.toDate} onChange={store.setToDate} />
        </>
      }
    >
      <FilterSearchInput
        placeholder={searchPlaceholder}
        value={store.invoiceNumber}
        onChange={(event) => store.setInvoiceNumber(event.target.value)}
      />

      <EntitySelect
        label={party.label}
        placeholder={`انتخاب ${party.label}...`}
        emptyText={party.emptyText}
        items={party.items}
        value={store[party.key]}
        onSelect={setParty}
        isLoading={party.isLoading}
        renderMeta={(item) =>
          party.phoneOf(item) ? (
            <span className="text-xs text-muted-foreground">{party.phoneOf(item)}</span>
          ) : null
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Label className="whitespace-nowrap font-medium text-foreground text-sm">وضعیت</Label>
        <Select
          value={String(store.status)}
          onValueChange={(value) => store.setStatus(parseQueueFilter(value))}
        >
          <SelectTrigger className="flex-1 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FilterPanel>
  );
}
