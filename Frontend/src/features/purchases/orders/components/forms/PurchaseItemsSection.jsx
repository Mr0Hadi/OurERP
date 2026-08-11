import { PackagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { ROUTES } from "@/shared/constants/routes";
import ProductSearchPanel from "./ProductSearchPanel";
import SelectedItemsTable from "./SelectedItemsTable";
import SelectedItemsCards from "./SelectedItemsCards";

export default function PurchaseItemsSection({
  items,
  onItemsChange,
  products = [],
}) {
  const navigate = useNavigate();

  const handleAddProduct = (product) => {
    const already = items.find((i) => i.productId === product.id);
    if (already) return;
    onItemsChange([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        unit: product.unit,
        qty: 1,
        unitPrice: product.purchasePrice ?? 0,
        discount: 0,
      },
    ]);
  };

  const handleRemoveItem = (productId) => {
    onItemsChange(items.filter((i) => i.productId !== productId));
  };

  const handleFieldChange = (productId, field, value) => {
    onItemsChange(
      items.map((i) =>
        i.productId === productId
          ? { ...i, [field]: Number(value) >= 0 ? Number(value) : 0 }
          : i,
      ),
    );
  };

  const lineTotal = (item) =>
    item.qty * item.unitPrice * (1 - (item.discount || 0) / 100);

  const grandTotal = items.reduce((sum, i) => sum + lineTotal(i), 0);

  const isAdded = (productId) => items.some((i) => i.productId === productId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اقلام خرید
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            navigate(ROUTES.WAREHOUSE_PRODUCTS_NEW, {
              state: { returnTo: ROUTES.PURCHASES_NEW },
            })
          }
          className="gap-1.5 text-xs"
        >
          <PackagePlus className="w-3.5 h-3.5" />
          افزودن کالای جدید
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <ProductSearchPanel
          products={products}
          isAdded={isAdded}
          onAdd={handleAddProduct}
          unitPriceField="purchasePrice"
        />

        {/* آیتم‌های انتخاب‌شده */}
        {items.length > 0 && (
          <>
            <SelectedItemsTable
              items={items}
              onFieldChange={handleFieldChange}
              onRemove={handleRemoveItem}
              lineTotal={lineTotal}
              grandTotal={grandTotal}
            />
            <SelectedItemsCards
              items={items}
              onFieldChange={handleFieldChange}
              onRemove={handleRemoveItem}
              lineTotal={lineTotal}
              grandTotal={grandTotal}
            />
          </>
        )}

        {items.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-3 border border-dashed border-border rounded-lg">
            هنوز کالایی انتخاب نشده
          </p>
        )}
      </CardContent>
    </Card>
  );
}
