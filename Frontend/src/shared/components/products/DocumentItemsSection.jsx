import { PackagePlus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import SectionCard from "@/shared/components/forms/SectionCard";
import ProductPicker from "@/shared/components/products/ProductPicker";

/**
 * کارتِ «اقلام»ِ فرمِ خرید/فروش: انتخابگرِ کالا (`ProductPicker`) و دکمه‌ی «کالای جدید».
 *
 * @param priceOf         قیمتِ پیش‌فرضِ کالای تازه (خرید: قیمتِ خرید؛ فروش: خرده/همکار)
 * @param trackUnits      اسکنِ دانه در اقلام (فروشِ حضوری)
 * @param actions         دکمه‌های اضافه‌ی سرِ کارت (مثلاً «قیمت خرده / همکار»)
 * @param onAddNewProduct رفتن به «کالای جدید» و برگشتن به همین فرم
 */
export default function DocumentItemsSection({
  title,
  items,
  onItemsChange,
  priceOf,
  trackUnits = false,
  actions,
  onAddNewProduct,
}) {
  return (
    <SectionCard
      title={title}
      action={
        <>
          {actions}
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
        priceOf={priceOf}
        trackUnits={trackUnits}
        showTaxHint
      />
    </SectionCard>
  );
}
