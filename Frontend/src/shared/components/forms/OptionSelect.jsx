import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

// مقدارِ ویژه‌ی ردیفِ «همه/هیچ». رشته‌ی خالی به Radix داده نمی‌شود چون آن را
// «بدون انتخاب» می‌فهمد و ردیف قابلِ انتخاب نمی‌ماند.
const NONE = "__none__";

const isEmpty = (value) => value === "" || value === null || value === undefined;

/**
 * کشوییِ ساده‌ی کنترل‌شده از روی آرایه‌ی `options` — جای ترکیبِ تکراریِ
 * `Select` + `SelectTrigger` + `SelectValue` + `SelectContent` + `map(SelectItem)`.
 *
 * Select همیشه *رشته* می‌دهد و می‌گیرد ولی enumها و شناسه‌های این پروژه عددی‌اند؛
 * پس مقدار در ورودی رشته می‌شود و در خروجی با `numeric`/`boolean` برمی‌گردد.
 * بدون این، مقایسه‌ی بعدی با مقدارِ واقعی (`===`) هیچ‌وقت درست درنمی‌آید.
 *
 * @param {{ value: string|number|boolean, label: React.ReactNode, disabled?: boolean, icon?: React.ComponentType }[]} options
 * @param {(value) => void} onChange مقدارِ تبدیل‌شده؛ ردیفِ `emptyLabel` → `emptyValue`
 * @param {boolean} [numeric] خروجی عدد شود
 * @param {boolean} [boolean] خروجی `true`/`false` شود (فیلترهای بولینِ سرور)
 * @param {React.ReactNode} [emptyLabel] ردیفِ صریحِ «همه»/«بدون …» در بالای فهرست
 * @param {*} [emptyValue] مقدارِ ردیفِ `emptyLabel` (پیش‌فرض `""`؛ فیلدِ اختیاریِ فرم `null`)
 * @param {boolean} [isLoading] غیرفعال با متنِ «در حال بارگذاری…»
 * @param {React.ReactNode} [prefix] متنِ کوچکِ ثابت داخلِ trigger پیش از مقدار («دوره:»)
 * @param {string} [className] کلاسِ trigger (پیش‌فرض تمام‌عرض)
 */
export default function OptionSelect({
  value,
  onChange,
  options = [],
  numeric = false,
  boolean = false,
  placeholder = "انتخاب کنید",
  emptyLabel,
  emptyValue = "",
  isLoading = false,
  disabled = false,
  id,
  size,
  dir,
  className = "w-full",
  contentClassName,
  itemClassName,
  prefix,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}) {
  const hasEmptyRow = emptyLabel != null;

  const toSelectValue = () => {
    if (isEmpty(value)) return hasEmptyRow ? NONE : "";
    return String(value);
  };

  const handleChange = (raw) => {
    if (raw === NONE) return onChange(emptyValue);
    if (boolean) return onChange(raw === "true");
    return onChange(numeric ? Number(raw) : raw);
  };

  return (
    <Select
      value={toSelectValue()}
      onValueChange={handleChange}
      disabled={disabled || isLoading}
      dir={dir}
    >
      <SelectTrigger
        id={id}
        size={size}
        className={className}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
      >
        {prefix}
        <SelectValue placeholder={isLoading ? "در حال بارگذاری..." : placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {hasEmptyRow && (
          <SelectItem value={NONE} className={itemClassName}>
            {emptyLabel}
          </SelectItem>
        )}
        {options.map(({ value: optionValue, label, disabled: optionDisabled, icon: Icon }) => (
          <SelectItem
            key={String(optionValue)}
            value={String(optionValue)}
            disabled={optionDisabled}
            className={itemClassName}
          >
            {Icon && <Icon className="size-4" />}
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
