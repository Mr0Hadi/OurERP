import { useState } from "react";

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
 * بدنه‌ی فرم — جدا از دیالوگ تا با `key={category?.id ?? "new"}` روی هر
 * بازشدن (رکوردِ متفاوت، یا افزودنِ تازه) از نو mount شود و `name` بدونِ
 * افکت از رویِ خودِ `category` مقداردهی شود.
 */
function CategoryFormFields({ category, onClose, onSaved }) {
  const [name, setName] = useState(category?.name || "");
  const [showError, setShowError] = useState(false);
  const isEdit = Boolean(category);

  const createMutation = useCreateProductCategoryMutation();
  const updateMutation = useUpdateProductCategoryMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const trimmed = name.trim();

  const handleSubmit = (event) => {
    event.preventDefault();
    // داخلِ فرمِ کالا هم باز می‌شود؛ submitِ این فرم از portal در درختِ React تا
    // فرمِ کالا بالا می‌رفت و آن را هم ذخیره می‌کرد.
    event.stopPropagation();
    if (!trimmed) {
      setShowError(true);
      return;
    }
    const done = (saved) => {
      onSaved?.(saved);
      onClose();
    };
    if (isEdit) {
      updateMutation.mutate({ id: category.id, name: trimmed }, { onSuccess: done });
    } else {
      createMutation.mutate({ name: trimmed }, { onSuccess: done });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-2 py-4">
        <Label htmlFor="categoryName">نام دسته‌بندی</Label>
        <Input
          id="categoryName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: سیستم تعلیق"
          aria-invalid={showError && !trimmed}
          autoFocus
        />
        {showError && !trimmed && (
          <p className="text-xs text-destructive">نام دسته‌بندی را بنویسید.</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          انصراف
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ثبت..." : isEdit ? "ذخیره" : "افزودن"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * دیالوگِ افزودن/ویرایشِ یک دسته‌بندی — هم در صفحه‌ی دسته‌بندی‌ها و هم کنارِ
 * انتخاب‌گرِ دسته در فرمِ کالا. وقتی `category` هست یعنی ویرایش.
 *
 * @param onSaved دسته‌ی ذخیره‌شده (`{ id, name }` از سرور)، مثلاً برای انتخابِ
 *                همان دسته در فرمِ کالا
 */
export default function CategoryFormDialog({ open, onOpenChange, category, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <CategoryFormFields
          key={category?.id ?? "new"}
          category={category}
          onClose={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}
