// src/features/warehouse/categories/components/CategoryFormDialog.jsx
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  useCreateProductCategoryMutation,
  useUpdateProductCategoryMutation,
} from "../services/mutations";

/**
 * بدنه‌ی فرم — جدا از دیالوگ تا با `key={category?.id ?? "new"}` روی
 * هر بازشدن (رکوردِ متفاوت، یا افزودنِ تازه) از نو mount شود. اینجوری
 * `name` بدونِ افکت و بدونِ خطرِ ماندنِ مقدارِ نویس‌نشده‌ی دفعه‌ی قبل
 * (که با یک افکتِ setState هم پیش می‌آمد) از رویِ خودِ `category` مقداردهی
 * اولیه می‌شود.
 */
function CategoryFormFields({ category, onCancel, onOpenChange }) {
  const [name, setName] = useState(category?.name || "");
  const isEdit = Boolean(category);

  const createMutation = useCreateProductCategoryMutation();
  const updateMutation = useUpdateProductCategoryMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("نام دسته‌بندی نمی‌تواند خالی باشد");
      return;
    }

    if (isEdit) {
      updateMutation.mutate(
        { id: category.id, name: trimmed },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(
        { name: trimmed },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-2 py-2">
        <Label htmlFor="categoryName">نام دسته‌بندی</Label>
        <Input
          id="categoryName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: سیستم تعلیق"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          انصراف
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "در حال ثبت..." : isEdit ? "ذخیره" : "افزودن"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * دیالوگِ افزودن/ویرایشِ یک دسته‌بندی. حالتش با حضورِ `category`
 * مشخص می‌شود، نه یک پراپِ جدا — وقتی `category` هست یعنی ویرایش.
 */
export default function CategoryFormDialog({ open, onOpenChange, category }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <CategoryFormFields
          key={category?.id ?? "new"}
          category={category}
          onCancel={() => onOpenChange(false)}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
