import PartyPickerCard from "@/shared/components/forms/PartyPickerCard";

/**
 * تامین‌کننده‌ی خرید. `onAddNew` را صفحه می‌دهد تا بعد از ساختِ
 * تامین‌کننده‌ی تازه به *همان* صفحه (خریدِ جدید یا پیش‌فاکتورِ در حالِ
 * ویرایش) برگردد.
 */
export default function PurchaseSupplierSection({
  suppliers = [],
  isLoading,
  selectedId,
  onSelect,
  onClear,
  onAddNew,
  error,
}) {
  return (
    <PartyPickerCard
      parties={suppliers}
      isLoading={isLoading}
      selectedId={selectedId}
      onSelect={onSelect}
      onClear={onClear}
      error={error}
      title="تامین‌کننده"
      addNewLabel="تامین‌کننده‌ی جدید"
      onAddNew={onAddNew}
      emptyListText="لیست تامین‌کنندگان خالی است"
      notFoundText="تامین‌کننده‌ای یافت نشد"
    />
  );
}
