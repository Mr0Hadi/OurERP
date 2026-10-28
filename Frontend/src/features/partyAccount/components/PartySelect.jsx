import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useCustomersOptionsQuery } from "@/features/customers/services/queries";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";

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
 * انتخابِ یک مشتری یا یک تامین‌کننده با جست‌وجو — فیلترِ فهرست‌ها و فیلدِ فرم. فهرست را
 * خودش می‌گیرد (`use*OptionsQuery`، یک کش برای همه‌ی انتخابگرهای صفحه)، پس صفحه‌ها
 * فهرستِ طرف‌حساب را برای فیلترها واکشی و دست‌به‌دست نمی‌کنند. فقط فهرستِ همان `side`
 * دانلود می‌شود.
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
  const isSupplier = side === "supplier";
  const customersQuery = useCustomersOptionsQuery({ enabled: enabled && !isSupplier });
  const suppliersQuery = useSuppliersOptionsQuery({ enabled: enabled && isSupplier });
  const texts = TEXTS[side];

  return (
    <EntitySelect
      label={label === undefined ? texts.label : label ?? undefined}
      placeholder={placeholder ?? texts.placeholder}
      emptyText={emptyText ?? texts.emptyText}
      items={isSupplier ? suppliersQuery.suppliers : customersQuery.customers}
      value={value ?? ""}
      onSelect={onSelect}
      isLoading={isSupplier ? suppliersQuery.isLoading : customersQuery.isLoading}
      allowClear={allowClear}
      renderMeta={renderPhone}
    />
  );
}
