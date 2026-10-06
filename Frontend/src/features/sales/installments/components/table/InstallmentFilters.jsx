import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import { useInstallmentFilterStore } from "../../store/installmentFilterStore";
import { INSTALLMENT_VIEWS } from "../../domain/installmentViews";

const VIEW_OPTIONS = Object.entries(INSTALLMENT_VIEWS).map(([value, view]) => ({ value, label: view.label }));

const renderCustomerPhone = (customer) =>
  customer.phoneNumber ? <span className="text-xs text-muted-foreground">{customer.phoneNumber}</span> : null;

/** فیلترهای فهرستِ اقساط: نما (پرداخت‌نشده، سررسیدگذشته، …)، مشتری و بازه‌ی سررسید. */
export default function InstallmentFilters({ customers = [], isCustomersLoading = false }) {
  const {
    view,
    customerId,
    fromDueDate,
    toDueDate,
    setView,
    setCustomerId,
    setFromDueDate,
    setToDueDate,
    resetFilters,
  } = useInstallmentFilterStore();

  return (
    <div className="space-y-3">
      <StatusChoice label="نمایش" options={VIEW_OPTIONS} value={view} onChange={setView} wrap />
      <FilterPanel
        onReset={resetFilters}
        dateRow={
          <>
            <FilterDateInput label="سررسید از" value={fromDueDate} onChange={setFromDueDate} />
            <FilterDateInput label="سررسید تا" value={toDueDate} onChange={setToDueDate} />
          </>
        }
      >
        <EntitySelect
          label="مشتری"
          placeholder="انتخاب مشتری..."
          emptyText="مشتری‌ای یافت نشد"
          items={customers}
          value={customerId}
          onSelect={(id) => setCustomerId(id)}
          isLoading={isCustomersLoading}
          renderMeta={renderCustomerPhone}
        />
      </FilterPanel>
    </div>
  );
}
