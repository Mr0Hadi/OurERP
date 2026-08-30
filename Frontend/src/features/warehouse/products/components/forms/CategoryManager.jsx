// src/features/warehouse/products/components/forms/CategoryManager.jsx
import { useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useProductCategoriesQuery } from "@/features/warehouse/categories/services/queries";
import { useCreateProductCategoryMutation } from "@/features/warehouse/categories/services/mutations";

/**
 * انتخاب دسته‌بندی کالا — با `productCategoryId` کار می‌کند، نه با نام.
 *
 * قبلاً فهرست دسته‌بندی‌ها در خودِ فرم هاردکد بود و «افزودن دسته‌بندی»
 * فقط یک آیتمِ محلی می‌ساخت که با رفرش صفحه از بین می‌رفت و هیچ‌وقت به
 * سرور نمی‌رسید. حالا فهرست از `api/ProductCategory` می‌آید و افزودن،
 * واقعاً `CreateProductCategory` را صدا می‌زند — چون
 * `CreateProductCommand` روی `ProductCategoryId > 0` اعتبارسنجی می‌کند
 * و نامِ آزاد را نمی‌پذیرد.
 */
export default function CategoryManager({ value, onChange }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const categoriesQuery = useProductCategoriesQuery();
  const createCategory = useCreateProductCategoryMutation();

  const categories = categoriesQuery.data ?? [];

  const handleAdd = () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("نام دسته‌بندی نمی‌تواند خالی باشد");
      return;
    }

    createCategory.mutate(
      { name },
      {
        onSuccess: (category) => {
          // دسته‌بندیِ تازه بلافاصله انتخاب می‌شود؛ کاربر برای همین ساختش.
          if (category?.id) onChange(String(category.id));
          setNewCategoryName("");
          setIsDialogOpen(false);
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value ? String(value) : ""} onValueChange={onChange}>
        <SelectTrigger className="flex-1" dir="rtl">
          <SelectValue
            placeholder={
              categoriesQuery.isLoading ? "در حال بارگذاری..." : "انتخاب کنید"
            }
          />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={String(cat.id)}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>افزودن دسته‌بندی جدید</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="newCategoryName">نام دسته‌بندی</Label>
            <Input
              id="newCategoryName"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="مثال: سیستم تعلیق"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={createCategory.isPending}
            >
              {createCategory.isPending ? "در حال ثبت..." : "افزودن"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
