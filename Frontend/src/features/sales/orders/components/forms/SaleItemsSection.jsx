import { PackagePlus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import ProductPicker from "@/shared/components/products/ProductPicker";

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
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-0">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اقلام فروش
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {onPriceModeChange && (
            <div
              role="group"
              aria-label="قیمت پیش‌فرض"
              className="inline-flex rounded-md border border-border p-0.5"
            >
              {Object.entries(SALE_PRICE_MODES).map(([key, { label }]) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={priceMode === key ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  aria-pressed={priceMode === key}
                  onClick={() => switchMode(key)}
                >
                  قیمت {label}
                </Button>
              ))}
            </div>
          )}
          {onAddNewProduct && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddNewProduct}
              className="gap-1.5 text-xs"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              کالای جدید
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ProductPicker
          items={items}
          onItemsChange={onItemsChange}
          products={products}
          isLoading={isLoadingProducts}
          priceOf={mode.priceOf}
          trackUnits
          showTaxHint
        />
      </CardContent>
    </Card>
  );
}
