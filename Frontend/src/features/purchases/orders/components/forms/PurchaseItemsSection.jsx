import { PackagePlus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
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
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اقلام خرید
        </CardTitle>
        {onAddNewProduct && (
          <CardAction>
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
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        <ProductPicker
          items={items}
          onItemsChange={onItemsChange}
          products={products}
          isLoading={isLoadingProducts}
          priceOf={(product) => product.purchasePrice ?? 0}
          showTaxHint
        />
      </CardContent>
    </Card>
  );
}
