import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { createProduct } from "@/features/warehouse/products/services/api-v1";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";
import { useProductCategoriesQuery } from "@/features/warehouse/categories/services/queries";
import { PRODUCT_UNIT_LABELS, unitLabelOf } from "@/shared/domain/enums/productUnit";

const DEFAULT_UNIT = 1;

/**
 * ساختِ سریعِ کالایی که در کاتالوگ نیست، از خودِ انبار.
 *
 * فقط نام، واحد و دسته — کالا با `isIncomplete: true` و موجودیِ صفر
 * ساخته می‌شود؛ ورودش به انبار از راهِ `unlistedItems` همین دریافت است و
 * واحد خرید بعداً برند و قیمت‌هایش را کامل می‌کند.
 */
export default function QuickCreateProductDialog({ open, onOpenChange, onCreated }) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useProductCategoriesQuery();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState(DEFAULT_UNIT);
  const [productCategoryId, setProductCategoryId] = useState(null);

  const mutation = useMutation({
    mutationFn: () =>
      createProduct({
        name: name.trim(),
        unit,
        productCategoryId,
        isIncomplete: true,
        stock: 0,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success("کالا به‌صورت ناقص ساخته شد");
      onCreated({
        productId: created.id,
        productCode: created.code,
        productName: name.trim(),
        unit: unitLabelOf(unit),
      });
      setName("");
      setProductCategoryId(null);
      onOpenChange(false);
    },
    onError: (error) => toast.error(error?.message || "خطا در ساخت کالا"),
  });

  const canSubmit = name.trim().length > 0 && productCategoryId != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ساخت سریع کالا</DialogTitle>
          <DialogDescription>
            کالا ناقص ثبت می‌شود؛ برند و قیمت‌ها را واحد خرید بعداً کامل می‌کند.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">نام کالا</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">واحد</Label>
              <Select value={String(unit)} onValueChange={(raw) => setUnit(Number(raw))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCT_UNIT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">دسته‌بندی</Label>
              <Select
                value={productCategoryId == null ? "" : String(productCategoryId)}
                onValueChange={(raw) => setProductCategoryId(Number(raw))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="انتخاب دسته" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "در حال ساخت..." : "ساخت و افزودن به دریافت"}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
