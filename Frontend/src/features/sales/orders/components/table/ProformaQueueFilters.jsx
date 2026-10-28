import { useCallback } from "react";

import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { optionsFromLabels } from "@/shared/lib/options";
import { SALE_PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import PartySelect from "@/features/partyAccount/components/PartySelect";

const PAYMENT_TYPE_OPTIONS = optionsFromLabels(SALE_PAYMENT_TYPE_LABELS);

/**
 * فیلترهای صفِ پیش‌فاکتور (انبار، صندوق): جست‌وجوی نامِ مشتری (در موبایل همیشه پیدا)، انتخابِ دقیقِ
 * مشتری، شیوه‌ی پرداخت و بازه‌ی سررسید. همان `FilterPanel`ِ بقیه‌ی فهرست‌ها.
 *
 * @param useStore استورِ `createProformaQueueFilterStore`
 */
export default function ProformaQueueFilters({ useStore }) {
  const store = useStore();
  const onSearch = useCallback((event) => store.setCustomerName(event.target.value), [store]);

  return (
    <FilterPanel
      onReset={store.resetFilters}
      store={useStore}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      primary={<FilterSearchInput placeholder="نامِ مشتری..." value={store.customerName} onChange={onSearch} />}
      dateRow={
        <>
          <FilterDateInput label="سررسید از" value={store.fromPaymentDate} onChange={store.setFromPaymentDate} />
          <FilterDateInput label="سررسید تا" value={store.toPaymentDate} onChange={store.setToPaymentDate} />
        </>
      }
    >
      <PartySelect side="customer" value={store.customerId} onSelect={store.setCustomerId} />
      <FilterSelect
        label="شیوه‌ی پرداخت"
        value={store.paymentType}
        onChange={store.setPaymentType}
        allLabel="همه"
        options={PAYMENT_TYPE_OPTIONS}
        numeric
      />
    </FilterPanel>
  );
}
