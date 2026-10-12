import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useProductCategoriesQuery } from "@/features/warehouse/categories/services/queries";

const NO_CATEGORIES = [];

/** دسته‌بندیِ کالا — فهرستِ کوچکِ کم‌تغییر، با جست‌وجوی داخلی. */
export default function CategoryFilterSelect({ value, onSelect }) {
  const { data = NO_CATEGORIES, isLoading } = useProductCategoriesQuery();
  return (
    <EntitySelect
      label="دسته‌بندی"
      placeholder="همه‌ی دسته‌ها"
      emptyText="دسته‌ای یافت نشد"
      items={data}
      value={value}
      onSelect={onSelect}
      isLoading={isLoading}
      getLabel={(category) => category.name}
    />
  );
}
