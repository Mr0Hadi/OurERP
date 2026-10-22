import { useCallback } from "react";

import { useCustomersOptionsQuery } from "@/features/customers/services/queries";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { SALE_PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";

const PAYMENT_TYPE_OPTIONS = toFilterOptions(SALE_PAYMENT_TYPE_LABELS);

const renderCustomerPhone = (customer) =>
  customer.phoneNumber ? <span className="text-xs text-muted-foreground">{customer.phoneNumber}</span> : null;

/**
 * فیلترهای صفِ پیش‌فاکتور (انبار، صندوق): جست‌وجوی نامِ مشتری (در موبایل همیشه پیدا)، انتخابِ دقیقِ
 * مشتری، شیوه‌ی پرداخت و بازه‌ی سررسید. همان `FilterPanel`ِ بقیه‌ی فهرست‌ها.
 *
 * @param useStore استورِ `createProformaQueueFilterStore`
 */
export default function ProformaQueueFilters({ useStore }) {
  const store = useStore();
  const { customers, isLoading } = useCustomersOptionsQuery();
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
      <EntitySelect
        label="مشتری"
        placeholder="انتخاب مشتری..."
        emptyText="مشتری‌ای یافت نشد"
        items={customers}
        value={store.customerId}
        onSelect={store.setCustomerId}
        isLoading={isLoading}
        renderMeta={renderCustomerPhone}
      />
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
