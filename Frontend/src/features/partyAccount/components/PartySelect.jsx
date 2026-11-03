import { useState } from "react";

import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useCustomerQuery, useCustomerSearchQuery } from "@/features/customers/services/queries";
import { useSupplierQuery, useSupplierSearchQuery } from "@/features/suppliers/services/queries";

const TEXTS = {
  customer: { label: "مشتری", placeholder: "انتخاب مشتری...", emptyText: "مشتری‌ای یافت نشد" },
  supplier: { label: "تامین‌کننده", placeholder: "انتخاب تامین‌کننده...", emptyText: "تامین‌کننده‌ای یافت نشد" },
};

const renderPhone = (party) => {
  const phone = party.phoneNumber || party.phone;
  return phone ? (
    <span className="text-xs text-muted-foreground" dir="ltr">
      {phone}
    </span>
  ) : null;
};

/**
 * انتخابِ یک مشتری یا یک تامین‌کننده با جست‌وجوی سرور — فیلترِ فهرست‌ها و فیلدِ فرم.
 * تا فهرست بسته است چیزی گرفته نمی‌شود؛ با بازشدن ۲۰ ردیفِ اول و با تایپ نتیجه‌ی
 * `use*SearchQuery` می‌آید. نامِ گزینه‌ی انتخاب‌شده (مثلاً از آدرس یا فرمِ ویرایش) از
 * جزئیاتِ همان طرف خوانده می‌شود، چون شاید در نتیجه‌ی جست‌وجو نباشد.
 *
 * @param {"customer"|"supplier"} side
 * @param {number|""} value شناسه، یا `""` برای «همه/هیچ»
 * @param {(id: number|"", party) => void} onSelect `""` یعنی پاک‌کردن
 * @param {string|null} [label] پیش‌فرض نامِ طرف؛ `null` برای فرم‌هایی که برچسبِ خودشان را دارند
 * @param {boolean} [allowClear] `false` برای فیلدِ اجباری
 * @param {boolean} [enabled] `false` تا وقتی انتخابگر دیده نمی‌شود (واکشی نکند)
 */
export default function PartySelect({
  side,
  value,
  onSelect,
  label,
  placeholder,
  emptyText,
  allowClear = true,
  enabled = true,
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const isSupplier = side === "supplier";
  const selectedId = enabled && value !== "" && value != null ? value : null;

  const customerSearch = useCustomerSearchQuery(search, { enabled: enabled && open && !isSupplier });
  const supplierSearch = useSupplierSearchQuery(search, { enabled: enabled && open && isSupplier });
  const customerQuery = useCustomerQuery(isSupplier ? null : selectedId);
  const supplierQuery = useSupplierQuery(isSupplier ? selectedId : null);
  const results = isSupplier ? supplierSearch : customerSearch;
  const texts = TEXTS[side];

  return (
    <EntitySelect
      label={label === undefined ? texts.label : label ?? undefined}
      placeholder={placeholder ?? texts.placeholder}
      emptyText={emptyText ?? texts.emptyText}
      items={results.results}
      selected={(isSupplier ? supplierQuery : customerQuery).data}
      value={value ?? ""}
      onSelect={onSelect}
      onSearchChange={setSearch}
      onOpenChange={setOpen}
      isLoading={open && results.isSearching && results.results.length === 0}
      allowClear={allowClear}
      renderMeta={renderPhone}
    />
  );
}
