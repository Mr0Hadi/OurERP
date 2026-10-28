import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import { useInstallmentFilterStore } from "../../store/installmentFilterStore";
import { INSTALLMENT_VIEWS } from "../../domain/installmentViews";
import PartySelect from "@/features/partyAccount/components/PartySelect";

const VIEW_OPTIONS = Object.entries(INSTALLMENT_VIEWS).map(([value, view]) => ({ value, label: view.label }));

/** فیلترهای فهرستِ اقساط: نما (پرداخت‌نشده، سررسیدگذشته، …)، مشتری و بازه‌ی سررسید. */
export default function InstallmentFilters() {
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
        store={useInstallmentFilterStore}
      >
        <PartySelect side="customer" value={customerId} onSelect={setCustomerId} />
      </FilterPanel>
    </div>
  );
}
