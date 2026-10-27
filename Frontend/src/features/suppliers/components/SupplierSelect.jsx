import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useSuppliersOptionsQuery } from "../services/queries";

/**
 * انتخابِ یک تامین‌کننده با جست‌وجو — فیلترِ فهرست‌ها و فیلدِ فرم. گزینه‌ها را خودش می‌گیرد
 * (`useSuppliersOptionsQuery`، یک‌بار برای همه‌ی انتخابگرهای صفحه).
 *
 * @param {number|string} value شناسه، یا `""` برای «هیچ/همه»
 * @param {(id: number|"") => void} onChange شناسه‌ی عددی؛ `""` یعنی پاک‌کردن
 * @param {string} [label] برچسبِ فیلتر؛ فرم‌ها برچسبِ خودشان را دارند
 * @param {string} [placeholder]
 * @param {boolean} [allowClear] `false` برای فیلدِ اجباری
 */
export default function SupplierSelect({
  value,
  onChange,
  label,
  placeholder = "انتخاب تامین‌کننده...",
  allowClear = true,
}) {
  const { suppliers, isLoading } = useSuppliersOptionsQuery();
  return (
    <EntitySelect
      label={label}
      placeholder={placeholder}
      items={suppliers}
      value={value ?? ""}
      onSelect={(id) => onChange(id === "" ? "" : Number(id))}
      isLoading={isLoading}
      allowClear={allowClear}
    />
  );
}
