import { PackagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import ProductPicker from "@/shared/components/products/ProductPicker";
import { ROUTES } from "@/shared/constants/routes";

export default function SaleItemsSection({
  items,
  onItemsChange,
  products = [],
}) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اقلام فروش
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            navigate(ROUTES.WAREHOUSE_PRODUCTS_NEW, {
              state: { returnTo: ROUTES.SALES_NEW },
            })
          }
          className="gap-1.5 text-xs"
        >
          <PackagePlus className="w-3.5 h-3.5" />
          افزودن کالای جدید
        </Button>
      </CardHeader>

      <CardContent>
        <ProductPicker
          items={items}
          onItemsChange={onItemsChange}
          products={products}
          priceOf={(product) => product.retailPrice ?? 0}
        />
      </CardContent>
    </Card>
  );
}
