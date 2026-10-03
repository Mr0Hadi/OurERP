import { useState } from "react";
import PartyPickerCard from "@/shared/components/forms/PartyPickerCard";
import { partyDisplayName } from "@/features/partyAccount/domain/partyName";
import { useSupplierQuery, useSupplierSearchQuery } from "@/features/suppliers/services/queries";

/**
 * تامین‌کننده‌ی خرید، با جست‌وجوی سمتِ سرور. `onAddNew` را صفحه می‌دهد تا
 * بعد از ساختِ تامین‌کننده‌ی تازه به *همان* صفحه (خریدِ جدید یا
 * پیش‌فاکتورِ در حالِ ویرایش) برگردد.
 *
 * انتخاب‌شده از جزئیاتِ سرور نشان داده می‌شود (تلفن، مانده)؛ تا برسد، از
 * ردیفِ جست‌وجو یا نامِ ذخیره‌شده در فرم.
 */
export default function PurchaseSupplierSection({
  selectedId,
  selectedName,
  onSelect,
  onClear,
  onAddNew,
  error,
  readOnly = false,
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(null);
  const { results, total, isSearching } = useSupplierSearchQuery(search, { enabled: !readOnly });
  const { data: detail } = useSupplierQuery(selectedId || null);

  const selected = !selectedId
    ? null
    : (Number(detail?.id) === Number(selectedId) && detail) ||
      (Number(picked?.id) === Number(selectedId) && picked) || { id: selectedId, companyName: selectedName };

  return (
    <PartyPickerCard
      title="تامین‌کننده"
      addNewLabel="تامین‌کننده‌ی جدید"
      onAddNew={onAddNew}
      error={error}
      search={search}
      onSearchChange={setSearch}
      results={results}
      total={total}
      isSearching={isSearching}
      selected={selected}
      onSelect={(party) => {
        setPicked(party);
        onSelect(party.id, partyDisplayName(party));
      }}
      onClear={onClear}
      readOnly={readOnly}
      searchPlaceholder="جست‌وجوی نام شرکت یا مسئول..."
      emptyListText="لیست تامین‌کنندگان خالی است"
      notFoundText="تامین‌کننده‌ای یافت نشد"
    />
  );
}
