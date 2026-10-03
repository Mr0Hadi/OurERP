import { useState } from "react";
import PartyPickerCard from "@/shared/components/forms/PartyPickerCard";
import { partyDisplayName } from "@/features/partyAccount/domain/partyName";
import { useCustomerQuery, useCustomerSearchQuery } from "@/features/customers/services/queries";

/**
 * مشتریِ فروش، با جست‌وجوی سمتِ سرور. `onAddNew` را صفحه می‌دهد تا بعد از
 * ساختِ مشتریِ تازه به *همان* صفحه (فروشِ جدید یا پیش‌فاکتورِ در حالِ
 * ویرایش) برگردد.
 *
 * انتخاب‌شده از جزئیاتِ سرور نشان داده می‌شود (تلفن، مانده)؛ تا برسد، از
 * ردیفِ جست‌وجو یا نامِ ذخیره‌شده در فرم.
 */
export default function SaleCustomerSection({
  step,
  selectedId,
  selectedName,
  onSelect,
  onClear,
  onAddNew,
  error,
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(null);
  const { results, total, isSearching } = useCustomerSearchQuery(search);
  const { data: detail } = useCustomerQuery(selectedId || null);

  const selected = !selectedId
    ? null
    : (Number(detail?.id) === Number(selectedId) && detail) ||
      (Number(picked?.id) === Number(selectedId) && picked) || { id: selectedId, firstName: selectedName };

  return (
    <PartyPickerCard
      step={step}
      title="مشتری"
      addNewLabel="مشتری جدید"
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
      searchPlaceholder="جست‌وجوی نام یا نام خانوادگی..."
      emptyListText="لیست مشتریان خالی است"
      notFoundText="مشتری‌ای یافت نشد"
    />
  );
}
