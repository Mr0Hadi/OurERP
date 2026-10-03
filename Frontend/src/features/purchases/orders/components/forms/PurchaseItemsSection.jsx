import { PackagePlus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import SectionCard from "@/shared/components/documents/SectionCard";
import ProductPicker from "@/shared/components/products/ProductPicker";

/** اقلامِ خرید، با قیمتِ خریدِ کالا به‌عنوانِ قیمتِ پیش‌فرض. */
export default function PurchaseItemsSection({
  items,
  onItemsChange,
  products = [],
  isLoadingProducts,
  onAddNewProduct,
}) {
  return (
    <SectionCard
      title="اقلام خرید"
      action={
        onAddNewProduct && (
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onAddNewProduct}>
            <PackagePlus className="size-3.5" />
            کالای جدید
          </Button>
        )
      }
    >
      <ProductPicker
        items={items}
        onItemsChange={onItemsChange}
        products={products}
        isLoading={isLoadingProducts}
        priceOf={(product) => product.purchasePrice ?? 0}
        showTaxHint
      />
    </SectionCard>
  );
}
