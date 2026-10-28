import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useProductCategoriesQuery } from "../services/queries";

const NO_CATEGORIES = [];
const nameOf = (category) => category.name;

/**
 * انتخابِ دسته‌بندیِ کالا با جست‌وجو — فیلترِ فهرست‌ها و فیلدِ فرم. فهرستِ کوچک و
 * کم‌تغییر را خودش می‌گیرد (`useProductCategoriesQuery`).
 *
 * @param {number|""} value شناسه، یا `""` برای «همه/هیچ»
 * @param {(id: number|"") => void} onSelect `""` یعنی پاک‌کردن
 * @param {string|null} [label] `null` برای فرم‌هایی که برچسبِ خودشان را دارند
 * @param {boolean} [allowClear] `false` برای فیلدِ اجباری
 */
export default function CategorySelect({
  value,
  onSelect,
  label = "دسته‌بندی",
  placeholder = "همه دسته‌ها",
  allowClear = true,
}) {
  const { data = NO_CATEGORIES, isLoading } = useProductCategoriesQuery();
  return (
    <EntitySelect
      label={label ?? undefined}
      placeholder={placeholder}
      emptyText="دسته‌بندی‌ای یافت نشد"
      items={data}
      value={value ?? ""}
      onSelect={onSelect}
      isLoading={isLoading}
      allowClear={allowClear}
      getLabel={nameOf}
    />
  );
}
