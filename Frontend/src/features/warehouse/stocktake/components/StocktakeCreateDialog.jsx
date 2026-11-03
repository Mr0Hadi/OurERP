import { useState } from "react";
import { X } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import FormField from "@/shared/components/forms/FormField";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import DialogActions from "@/shared/components/feedback/DialogActions";
import CategorySelect from "@/features/warehouse/categories/components/CategorySelect";
import ProductSelect from "@/features/warehouse/products/components/ProductSelect";
import BrandSuggestions from "@/features/warehouse/products/components/BrandSuggestions";
import WarehouseSelect from "@/features/warehouse/warehouses/components/WarehouseSelect";
import { useWarehouseChoice } from "@/features/warehouse/warehouses/hooks/useMultiWarehouse";
import { useCreateStocktakeMutation } from "../services/mutations";
import {
  STOCKTAKE_SCOPE,
  STOCKTAKE_SCOPE_LABELS,
  emptyStocktakeDraft,
  stocktakeDraftErrors,
  toApiStocktake,
} from "../domain/stocktake";

const SCOPE_OPTIONS = [
  { value: STOCKTAKE_SCOPE.CATEGORY_BRAND, label: STOCKTAKE_SCOPE_LABELS[STOCKTAKE_SCOPE.CATEGORY_BRAND], hint: "همه‌ی کالاهای فعالِ یک دسته، یک برند، یا هر دو" },
  { value: STOCKTAKE_SCOPE.BIN, label: STOCKTAKE_SCOPE_LABELS[STOCKTAKE_SCOPE.BIN], hint: "کالاهایی که دانه‌ای در قفسه‌ای با این پیشوند دارند" },
  { value: STOCKTAKE_SCOPE.PRODUCTS, label: STOCKTAKE_SCOPE_LABELS[STOCKTAKE_SCOPE.PRODUCTS], hint: "چند کالای مشخص" },
];

/** بدنه‌ی فرم — با هر بازشدن از نو mount می‌شود تا پیش‌نویسِ قبلی نماند. */
function FormBody({ onClose, onSaved }) {
  const [draft, setDraft] = useState(emptyStocktakeDraft);
  const [showErrors, setShowErrors] = useState(false);
  const create = useCreateStocktakeMutation();
  const warehouseChoice = useWarehouseChoice();

  const errors = stocktakeDraftErrors(draft);
  const errorOf = (field) => (showErrors ? errors[field] : undefined);
  const patch = (next) => setDraft((current) => ({ ...current, ...next }));

  const addProduct = (id, product) => {
    if (!id || draft.products.some((item) => item.id === id)) return;
    patch({ products: [...draft.products, { id, name: product?.name ?? `#${id}`, code: product?.code }] });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (Object.keys(errors).length > 0) return setShowErrors(true);
    create.mutate(toApiStocktake(draft), {
      onSuccess: (saved) => {
        onSaved?.(saved);
        onClose();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>انبارگردانیِ تازه</DialogTitle>
        <DialogDescription>
          با ساخت، موجودیِ همین لحظه‌ی سیستم مبنای مقایسه ثبت می‌شود و شمارش با آن سنجیده می‌شود؛ فروش و دریافت لازم نیست متوقف شود.
        </DialogDescription>
      </DialogHeader>

      <fieldset disabled={create.isPending} className="min-w-0 space-y-3">
        <FormField label="عنوان" htmlFor="stocktake-title" required error={errorOf("title")}>
          <Input
            id="stocktake-title"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="مثلاً انبارگردانیِ لنت‌ها، پاییز"
            maxLength={200}
            autoFocus
          />
        </FormField>

        {warehouseChoice && (
          <FormField label="انبار" hint="فقط دانه‌های همین انبار شمرده و مقایسه می‌شوند">
            <WarehouseSelect
              value={draft.warehouseId}
              onChange={(warehouseId) => patch({ warehouseId })}
              emptyLabel="انبارِ پیش‌فرض"
            />
          </FormField>
        )}

        <StatusChoice label="دامنه" options={SCOPE_OPTIONS} value={draft.scope} onChange={(scope) => patch({ scope })} />

        {draft.scope === STOCKTAKE_SCOPE.CATEGORY_BRAND && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="دسته‌بندی">
              <CategorySelect
                label={null}
                value={draft.productCategoryId}
                onSelect={(productCategoryId) => patch({ productCategoryId })}
                placeholder="بدونِ دسته"
              />
            </FormField>
            <FormField label="برند" htmlFor="stocktake-brand">
              <Input
                id="stocktake-brand"
                list="stocktake-brand-suggestions"
                value={draft.brand}
                onChange={(e) => patch({ brand: e.target.value })}
                maxLength={100}
              />
              <BrandSuggestions id="stocktake-brand-suggestions" value={draft.brand} />
            </FormField>
          </div>
        )}

        {draft.scope === STOCKTAKE_SCOPE.BIN && (
          <FormField label="قفسه" htmlFor="stocktake-bin" hint="پیشوندِ جایگاه؛ مثلاً A-1 همه‌ی A-1-… را می‌گیرد">
            <Input
              id="stocktake-bin"
              dir="ltr"
              value={draft.binLocationPrefix}
              onChange={(e) => patch({ binLocationPrefix: e.target.value })}
              maxLength={50}
            />
          </FormField>
        )}

        {draft.scope === STOCKTAKE_SCOPE.PRODUCTS && (
          <div className="space-y-2">
            <ProductSelect value="" onSelect={addProduct} label="افزودنِ کالا" placeholder="جست‌وجوی نام، کد یا بارکد..." />
            {draft.products.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {draft.products.map((product) => (
                  <li key={product.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">{product.name}</span>
                    {product.code && (
                      <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                        {product.code}
                      </span>
                    )}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="برداشتن"
                      onClick={() => patch({ products: draft.products.filter((item) => item.id !== product.id) })}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {errorOf("scope") && <p className="text-xs text-destructive">{errorOf("scope")}</p>}

        <FormField label="یادداشت" htmlFor="stocktake-note">
          <Textarea
            id="stocktake-note"
            rows={2}
            maxLength={1000}
            value={draft.note}
            onChange={(e) => patch({ note: e.target.value })}
          />
        </FormField>
      </fieldset>

      <DialogActions onCancel={onClose} isPending={create.isPending} submitLabel="ساخت و شروعِ شمارش" />
    </form>
  );
}

/**
 * ساختِ انبارگردانی (`CreateStocktake`، دسترسیِ `StocktakeCount`). اگر انبارگردانیِ بازِ دیگری کالای مشترک داشته
 * باشد سرور ۴۰۰ می‌دهد و پیامش نشان داده می‌شود.
 *
 * @param onSaved `(stocktake) => void` — معمولاً رفتن به صفحه‌ی شمارش
 */
export default function StocktakeCreateDialog({ open, onOpenChange, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {open && <FormBody onClose={() => onOpenChange(false)} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}
