import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import ProductSearchPanel from "@/shared/components/forms/ProductSearchPanel";
import SelectedItemsTable from "@/shared/components/forms/SelectedItemsTable";
import SelectedItemsCards from "@/shared/components/forms/SelectedItemsCards";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";

/**
 * انتخاب کالا + فهرست اقلام انتخاب‌شده — یک‌جا و مشترک.
 *
 * پیش از این، همین منطق سه بار تکرار شده بود (اقلام فروش، اقلام خرید،
 * کالای جایگزینِ مرجوعی) و هر سه نسخه باید جدا اصلاح می‌شدند؛ همان
 * چیزی که باعث شد باگِ «افزوده شد» فقط در مرجوعی بماند. حالا افزودن،
 * حذف، ویرایش تعداد/قیمت و جمع‌زدن فقط اینجاست.
 *
 * تفاوت‌های واقعیِ سه مصرف‌کننده به‌شکل prop درآمده‌اند:
 *
 *   • priceOf   — فروش از قیمت فروش می‌خواند و خرید از قیمت خرید.
 *   • collapsible — در مرجوعی، انتخابگر نقش فرعی دارد و تاشو است، پس
 *     اقلامِ انتخاب‌شده بالا می‌آیند و خودِ انتخابگر پشتِ یک دکمه
 *     می‌رود؛ در فرم خرید/فروش برعکس، انتخابگر کارِ اصلی است و بالاست.
 *
 * افزودن کالایی که از قبل در فهرست است، تعدادش را یکی زیاد می‌کند —
 * چه از دکمه‌ی + و چه از اسکن بارکد.
 */

const lineTotalOf = (item) =>
  (Number(item.quantity) || 0) *
  (Number(item.unitPrice) || 0) *
  (1 - (Number(item.discount) || 0) / 100);

export default function ProductPicker({
  items,
  onItemsChange,
  products = [],
  isLoading = false,
  priceOf = (product) => product.retailPrice ?? 0,
  emptyText = "هنوز کالایی انتخاب نشده",
  collapsible = false,
  openLabel = "انتخاب کالا",
  closeLabel = "بستن لیست کالاها",
}) {
  // در حالت تاشو، اگر هنوز چیزی انتخاب نشده باز باشد بهتر است — کاربر
  // برای همین آمده.
  const [isPickerOpen, setIsPickerOpen] = useState(items.length === 0);

  const addedQuantityOf = (productId) =>
    Number(items.find((item) => item.productId === productId)?.quantity) || 0;

  const handleAdd = (product) => {
    if (items.some((item) => item.productId === product.id)) {
      onItemsChange(
        items.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: (Number(item.quantity) || 0) + 1 }
            : item,
        ),
      );
      return;
    }
    onItemsChange([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        unit: unitLabelOf(product.unit),
        quantity: 1,
        unitPrice: priceOf(product),
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

  const grandTotal = items.reduce((sum, item) => sum + lineTotalOf(item), 0);

  /**
   * جزئیاتِ خرید/فروش که از سرور می‌آید نام و واحدِ کالا را کامل ندارد
   * (`PurchaseItemDto` واحد نمی‌فرستد و `GetSaleDetail` حتی نام کالا را
   * هم نمی‌دهد). چون فهرستِ کالاها همین‌جا در دسترس است، جای خالی از
   * روی `productId` پر می‌شود — فقط برای نمایش؛ چیزی به state اضافه
   * نمی‌شود.
   */
  const displayItems = items.map((item) => {
    if (item.productName && item.unit) return item;
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) return item;
    return {
      ...item,
      productName: item.productName || product.name,
      productCode: item.productCode || product.code,
      unit: item.unit || unitLabelOf(product.unit),
    };
  });

  const selectedItems = items.length > 0 && (
    <>
      <SelectedItemsTable
        items={displayItems}
        onFieldChange={handleFieldChange}
        onRemove={handleRemove}
        lineTotal={lineTotalOf}
        grandTotal={grandTotal}
      />
      <SelectedItemsCards
        items={displayItems}
        onFieldChange={handleFieldChange}
        onRemove={handleRemove}
        lineTotal={lineTotalOf}
        grandTotal={grandTotal}
      />
    </>
  );

  const searchPanel = isLoading ? (
    <p className="text-xs text-muted-foreground text-center py-4">
      در حال بارگذاری کالاها...
    </p>
  ) : (
    <ProductSearchPanel
      products={products}
      addedQuantityOf={addedQuantityOf}
      onAdd={handleAdd}
    />
  );

  if (collapsible) {
    return (
      <div className="space-y-2 rounded-md border border-border bg-card/60 p-2.5">
        {selectedItems}

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
          {isPickerOpen ? closeLabel : openLabel}
        </Button>

        {isPickerOpen && searchPanel}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {searchPanel}
      {selectedItems}
      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-3 border border-dashed border-border rounded-lg">
          {emptyText}
        </p>
      )}
    </div>
  );
}
