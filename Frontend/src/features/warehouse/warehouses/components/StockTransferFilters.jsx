import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterMultiSelect from "@/shared/components/filters/FilterMultiSelect";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { STOCK_TRANSFER_STATUS_LABELS } from "@/shared/domain/enums/stockTransfer";
import { optionsFromLabels } from "@/shared/lib/options";
import { useWarehousesQuery } from "../services/queries";
import { useStockTransferFilterStore } from "../store/stockTransferFilterStore";

const STATUS_OPTIONS = optionsFromLabels(STOCK_TRANSFER_STATUS_LABELS, { numeric: true });

/** فیلترهای فهرستِ حواله‌ها: شماره/توضیح، وضعیت (چندتایی)، مبدأ، مقصد و بازه‌ی تاریخِ ارسال. */
export default function StockTransferFilters() {
  const store = useStockTransferFilterStore();
  // غیرفعال‌ها هم، چون حواله‌های قدیمی ممکن است از آن‌ها باشند.
  const { data: warehouses = [] } = useWarehousesQuery({ includeInactive: true });
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));

  return (
    <FilterPanel
      store={useStockTransferFilterStore}
      onReset={store.resetFilters}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
      primary={
        <FilterSearchInput
          placeholder="شماره یا توضیح..."
          value={store.search}
          onChange={(e) => store.setSearch(e.target.value)}
        />
      }
      dateRow={
        <>
          <FilterDateInput label="ارسال از" value={store.fromDate} onChange={store.setFromDate} />
          <FilterDateInput label="ارسال تا" value={store.toDate} onChange={store.setToDate} />
        </>
      }
    >
      <FilterMultiSelect
        label="وضعیت"
        options={STATUS_OPTIONS}
        value={store.statuses}
        onChange={store.setStatuses}
        allLabel="همه‌ی وضعیت‌ها"
      />
      <FilterSelect
        label="مبدأ"
        value={store.fromWarehouseId}
        onChange={store.setFromWarehouseId}
        options={warehouseOptions}
        allLabel="همه‌ی انبارها"
        numeric
      />
      <FilterSelect
        label="مقصد"
        value={store.toWarehouseId}
        onChange={store.setToWarehouseId}
        options={warehouseOptions}
        allLabel="همه‌ی انبارها"
        numeric
      />
    </FilterPanel>
  );
}
