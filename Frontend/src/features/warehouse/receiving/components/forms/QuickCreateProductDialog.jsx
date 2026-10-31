import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { createProduct } from "@/features/warehouse/products/services/api-v1";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";
import { PRODUCT_UNIT_OPTIONS, unitLabelOf } from "@/shared/domain/enums/productUnit";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import OptionSelect from "@/shared/components/forms/OptionSelect";
import CategorySelect from "@/features/warehouse/categories/components/CategorySelect";
import DialogActions from "@/shared/components/feedback/DialogActions";

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
    onError: (error) => toast.error(getErrorMessage(error, "ساخت کالا انجام نشد")),
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
              <OptionSelect
                value={unit}
                onChange={setUnit}
                options={PRODUCT_UNIT_OPTIONS}
                numeric
                className="h-9 w-fit text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">دسته‌بندی</Label>
              <CategorySelect
                label={null}
                placeholder="انتخاب دسته"
                value={productCategoryId}
                onSelect={(id) => setProductCategoryId(id === "" ? null : id)}
                allowClear={false}
              />
            </div>
          </div>
        </div>

        <DialogActions
          onCancel={() => onOpenChange(false)}
          onSubmit={() => mutation.mutate()}
          isPending={mutation.isPending}
          disabled={!canSubmit}
          pendingLabel="در حال ساخت..."
          submitLabel="ساخت و افزودن به دریافت"
        />
      </DialogContent>
    </Dialog>
  );
}
