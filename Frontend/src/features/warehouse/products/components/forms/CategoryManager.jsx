import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useProductCategoriesQuery } from "@/features/warehouse/categories/services/queries";
import CategoryFormDialog from "@/features/warehouse/categories/components/CategoryFormDialog";

/**
 * انتخابِ دسته‌بندیِ کالا (با `productCategoryId`، نه نام) و افزودنِ دسته‌ی
 * تازه از همان‌جا — با همان دیالوگِ صفحه‌ی دسته‌بندی‌ها. دسته‌ی تازه بلافاصله
 * انتخاب می‌شود؛ کاربر برای همین ساختش.
 */
export default function CategoryManager({ value, onChange }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: categories = [], isLoading } = useProductCategoriesQuery();

  return (
    <div className="flex items-center gap-2">
      <Select value={value ? String(value) : ""} onValueChange={onChange}>
        <SelectTrigger className="flex-1" dir="rtl">
          <SelectValue placeholder={isLoading ? "در حال بارگذاری..." : "انتخاب کنید"} />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {categories.map((category) => (
            <SelectItem key={category.id} value={String(category.id)}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
