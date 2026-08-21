import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import ProductSearchPanel from "@/shared/components/forms/ProductSearchPanel";
import SelectedItemsTable from "@/shared/components/forms/SelectedItemsTable";
import SelectedItemsCards from "@/shared/components/forms/SelectedItemsCards";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

/**
 * انتخاب کالاهایی که باید برای مشتری ارسال شوند.
 *
 * عمداً همان سه کامپوننتِ صفحه‌ی ثبت فروش را استفاده می‌کند
 * (ProductSearchPanel + SelectedItemsTable + SelectedItemsCards) تا
 * کاربر دقیقاً همان تجربه‌ای را داشته باشد که موقع ثبت فروش دارد؛ نه
 * یک انتخابگر دوم با رفتار متفاوت.
 *
 * کالاها لازم نیست ربطی به کالای ادعا داشته باشند — همین است که
 * «تعویض با کالای دیگر» و «فرستادن چند کالا به‌جای یکی» را ممکن
 * می‌کند.
 */
export default function ReplacementItemsPicker({ items, onItemsChange }) {
  const [isPickerOpen, setIsPickerOpen] = useState(items.length === 0);
  const { data: productsData, isLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );

  const products = useMemo(() => productsData?.items ?? [], [productsData]);

  const handleAdd = (product) => {
    if (items.some((item) => item.productId === product.id)) return;
    onItemsChange([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        unit: product.unit,
        qty: 1,
        unitPrice: product.retailPrice ?? 0,
        discount: 0,
      },
    ]);
  };

  const handleRemove = (productId) =>
    onItemsChange(items.filter((item) => item.productId !== productId));

  const handleFieldChange = (productId, field, value) =>
    onItemsChange(
      items.map((item) =>
        item.productId === productId
          ? { ...item, [field]: Number(value) >= 0 ? Number(value) : 0 }
          : item,
      ),
    );

  // قیمت اینجا فقط برای دیدن ارزش محموله است؛ اثر مالیِ تصمیم از بخش
  // پول می‌آید، نه از این جدول.
  const lineTotal = (item) =>
    item.qty * item.unitPrice * (1 - (item.discount || 0) / 100);
  const grandTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  return (
    <div className="space-y-2 rounded-md border border-border bg-card/60 p-2.5">
      {items.length > 0 && (
        <>
          <SelectedItemsTable
            items={items}
            onFieldChange={handleFieldChange}
            onRemove={handleRemove}
            lineTotal={lineTotal}
            grandTotal={grandTotal}
          />
          <SelectedItemsCards
            items={items}
            onFieldChange={handleFieldChange}
            onRemove={handleRemove}
            lineTotal={lineTotal}
            grandTotal={grandTotal}
          />
        </>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full h-8 text-xs gap-1.5"
        onClick={() => setIsPickerOpen((open) => !open)}
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            isPickerOpen ? "rotate-180" : ""
          }`}
        />
        {isPickerOpen ? "بستن لیست کالاها" : "انتخاب کالا برای ارسال"}
      </Button>

      {isPickerOpen &&
        (isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            در حال بارگذاری کالاها...
          </p>
        ) : (
          <ProductSearchPanel
            products={products}
            isAdded={(product) =>
              items.some((item) => item.productId === product.id)
            }
            onAdd={handleAdd}
          />
        ))}
    </div>
  );
}
