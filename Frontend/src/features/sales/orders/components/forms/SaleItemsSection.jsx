import { PackagePlus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import SectionCard from "@/shared/components/documents/SectionCard";
import ProductPicker from "@/shared/components/products/ProductPicker";
import { cn } from "@/shared/lib/utils";

/** دو قیمتِ فروشِ هر کالا. */
const SALE_PRICE_MODES = {
  retail: { label: "خرده", priceOf: (product) => product.retailPrice ?? 0 },
  wholesale: {
    label: "همکار / عمده",
    priceOf: (product) => product.wholeSalePrice ?? product.retailPrice ?? 0,
  },
};

/**
 * اقلامِ فروش، با کلیدِ «خرده / همکار» برای قیمتِ پیش‌فرض.
 *
 * عوض‌کردنِ حالت، قیمتِ اقلامی را هم که هنوز روی قیمتِ پیش‌فرضِ حالتِ قبلی
 * مانده‌اند به‌روز می‌کند؛ قیمتی که کاربر دستی عوض کرده دست نمی‌خورد.
 */
export default function SaleItemsSection({
  step,
  items,
  onItemsChange,
  products = [],
  isLoadingProducts,
  priceMode = "retail",
  onPriceModeChange,
  onAddNewProduct,
}) {
  const mode = SALE_PRICE_MODES[priceMode] ?? SALE_PRICE_MODES.retail;

  const switchMode = (nextMode) => {
    if (nextMode === priceMode || !onPriceModeChange) return;
    const previous = mode.priceOf;
    const next = SALE_PRICE_MODES[nextMode].priceOf;
    onItemsChange(
      items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product || Number(item.unitPrice) !== Number(previous(product))) return item;
        return { ...item, unitPrice: next(product) };
      }),
    );
    onPriceModeChange(nextMode);
  };

  return (
    <SectionCard
      step={step}
      title="اقلام فروش"
      action={
        <>
          {onPriceModeChange && (
            <div
              role="radiogroup"
              aria-label="قیمت پیش‌فرض"
              className="inline-flex rounded-lg bg-muted p-0.5"
            >
              {Object.entries(SALE_PRICE_MODES).map(([key, { label }]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={priceMode === key}
                  onClick={() => switchMode(key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    priceMode === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  قیمت {label}
                </button>
              ))}
            </div>
          )}
          {onAddNewProduct && (
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onAddNewProduct}>
              <PackagePlus className="size-3.5" />
              کالای جدید
            </Button>
          )}
        </>
      }
    >
      <ProductPicker
        items={items}
        onItemsChange={onItemsChange}
        products={products}
        isLoading={isLoadingProducts}
        priceOf={mode.priceOf}
        trackUnits
        showTaxHint
      />
    </SectionCard>
  );
}
