import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import CategoryFormDialog from "@/features/warehouse/categories/components/CategoryFormDialog";
import CategorySelect from "@/features/warehouse/categories/components/CategorySelect";

/**
 * انتخابِ دسته‌بندیِ کالا (با `productCategoryId`، نه نام) با جست‌وجوی تایپی،
 * و افزودنِ دسته‌ی تازه از همان‌جا — با همان دیالوگِ صفحه‌ی دسته‌بندی‌ها.
 * دسته‌ی تازه بلافاصله انتخاب می‌شود؛ کاربر برای همین ساختش. فیلدِ فرم
 * اجباری است، پس انتخاب با کلیکِ دوباره برداشته نمی‌شود (`allowClear={false}`).
 */
export default function CategoryManager({ value, onChange }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <CategorySelect
          label={null}
          placeholder="انتخاب کنید"
          value={value || ""}
          onSelect={onChange}
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
