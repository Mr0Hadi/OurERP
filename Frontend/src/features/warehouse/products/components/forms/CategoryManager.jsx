import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useProductCategoriesQuery } from "@/features/warehouse/categories/services/queries";
import CategoryFormDialog from "@/features/warehouse/categories/components/CategoryFormDialog";

/**
 * انتخابِ دسته‌بندیِ کالا، با جست‌وجو با تایپ (با `productCategoryId`، نه نام) و افزودنِ دسته‌ی
 * تازه از همان‌جا — با همان دیالوگِ صفحه‌ی دسته‌بندی‌ها. دسته‌ی تازه بلافاصله
 * انتخاب می‌شود؛ کاربر برای همین ساختش.
 */
export default function CategoryManager({ value, onChange }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: categories = [], isLoading } = useProductCategoriesQuery();

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <EntitySelect
          placeholder="انتخاب کنید"
          emptyText="دسته‌بندی‌ای یافت نشد"
          items={categories}
          value={value ? String(value) : ""}
          onSelect={onChange}
          isLoading={isLoading}
          allowClear={false}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        aria-label="افزودن دسته‌بندی جدید"
        onClick={() => setIsDialogOpen(true)}
      >
        <Plus className="w-4 h-4" />
      </Button>

      <CategoryFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSaved={(category) => category?.id && onChange(String(category.id))}
      />
    </div>
  );
}
