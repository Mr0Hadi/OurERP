import { useState } from "react";

import PartyPickerCard from "@/shared/components/forms/PartyPickerCard";

/**
 * طرف‌حسابِ یک سندِ خرید/فروش (تامین‌کننده یا مشتری) با جست‌وجوی سمتِ سرور.
 * `onAddNew` را صفحه می‌دهد تا بعد از ساختِ طرف‌حسابِ تازه به *همان* صفحه
 * (سندِ جدید یا پیش‌فاکتورِ در حالِ ویرایش) برگردد.
 *
 * انتخاب‌شده از جزئیاتِ سرور نشان داده می‌شود (تلفن، مانده)؛ تا برسد، از ردیفِ
 * جست‌وجو یا نامِ ذخیره‌شده در فرم.
 *
 * @param party  پیکربندیِ ثابتِ هر سمت (ثابتِ ماژول، تا هوک‌ها در هر رندر یکی باشند):
 *   `{ useSearchQuery, useDetailQuery, displayName, placeholder(id, name), texts }`؛
 *   `texts`: `{ title, addNew, searchPlaceholder, empty, notFound }`
 */
export default function PartySection({
  party,
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
  const { results, total, isSearching } = party.useSearchQuery(search, { enabled: !readOnly });
  const { data: detail } = party.useDetailQuery(selectedId || null);

  const selected = !selectedId
    ? null
    : (Number(detail?.id) === Number(selectedId) && detail) ||
      (Number(picked?.id) === Number(selectedId) && picked) ||
      party.placeholder(selectedId, selectedName);

  return (
    <PartyPickerCard
      title={party.texts.title}
      addNewLabel={party.texts.addNew}
      onAddNew={onAddNew}
      error={error}
      search={search}
      onSearchChange={setSearch}
      results={results}
      total={total}
      isSearching={isSearching}
      selected={selected}
      onSelect={(candidate) => {
        setPicked(candidate);
        onSelect(candidate.id, party.displayName(candidate));
      }}
      onClear={onClear}
      readOnly={readOnly}
      searchPlaceholder={party.texts.searchPlaceholder}
      emptyListText={party.texts.empty}
      notFoundText={party.texts.notFound}
    />
  );
}
