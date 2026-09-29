import PartyPickerCard from "@/shared/components/forms/PartyPickerCard";

/**
 * مشتریِ فروش. `onAddNew` را صفحه می‌دهد تا بعد از ساختِ مشتریِ تازه به
 * *همان* صفحه (فروشِ جدید یا پیش‌فاکتورِ در حالِ ویرایش) برگردد.
 */
export default function SaleCustomerSection({
  customers = [],
  isLoading,
  selectedId,
  onSelect,
  onClear,
  onAddNew,
  error,
}) {
  return (
    <PartyPickerCard
      parties={customers}
      isLoading={isLoading}
      selectedId={selectedId}
      onSelect={onSelect}
      onClear={onClear}
      error={error}
      title="مشتری"
      addNewLabel="مشتری جدید"
      onAddNew={onAddNew}
      emptyListText="لیست مشتریان خالی است"
      notFoundText="مشتری‌ای یافت نشد"
    />
  );
}
