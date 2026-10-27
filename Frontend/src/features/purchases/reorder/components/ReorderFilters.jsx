import { ResponsiveFilters } from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import SupplierSelect from "@/features/suppliers/components/SupplierSelect";
import { useReorderFilterStore } from "../store/reorderFilterStore";

/** جست‌وجو و تامین‌کننده — در یک ردیف؛ موبایل: تامین‌کننده زیرِ دکمه‌ی «فیلترها». */
export default function ReorderFilters() {
  const store = useReorderFilterStore();

  return (
    <ResponsiveFilters
      store={useReorderFilterStore}
      onReset={store.resetFilters}
      primary={
        <FilterSearchInput
          placeholder="نام، کد یا برندِ کالا..."
          value={store.search}
          onChange={(e) => store.setSearch(e.target.value)}
        />
      }
      className="grid gap-3 sm:grid-cols-2 sm:space-y-0"
    >
      <SupplierSelect
        placeholder="همه تامین‌کنندگان"
        value={store.supplierId}
        onChange={store.setSupplierId}
      />
    </ResponsiveFilters>
  );
}
