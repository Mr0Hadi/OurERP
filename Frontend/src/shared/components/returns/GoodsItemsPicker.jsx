import { useState } from "react";
import ProductPicker from "@/shared/components/products/ProductPicker";
import { useProductsOptionsQuery } from "@/features/warehouse/products/services/queries";

/**
 * انتخاب کالاهای یک محورِ کالاییِ تصمیم — چه به سمت مشتری برود و چه
 * از تامین‌کننده بیاید.
 *
 * عمداً همان ProductPicker صفحه‌ی ثبت خرید/فروش را استفاده می‌کند تا
 * کاربر دقیقاً همان تجربه‌ای را داشته باشد که موقع ثبت فروش دارد؛ نه
 * یک انتخابگر دوم با رفتار متفاوت. تنها تفاوت، تاشو بودنش است: اینجا
 * انتخاب کالا کارِ فرعی است، نه کارِ اصلیِ صفحه.
 *
 * کالاها لازم نیست ربطی به کالای ادعا داشته باشند — همین است که
 * «تعویض با کالای دیگر» و «چند کالا به‌جای یکی» را ممکن می‌کند. اگر
 * هیچ کالایی انتخاب نشود، دامنه خودش کالای ادعا را با تعدادِ تصمیم
 * می‌گذارد.
 *
 * فهرستِ کالاها (۲۰۰ ردیف) فقط وقتی گرفته می‌شود که انتخابگر باز است؛ حالتِ رایج
 * «همان کالا» هیچ‌وقت بازش نمی‌کند.
 */
export default function GoodsItemsPicker({
  items,
  onItemsChange,
  openLabel = "انتخاب کالا",
  priceOf,
}) {
  // همان مقدارِ اولیه‌ی `ProductPicker`: بی قلمِ انتخاب‌شده باز است.
  const [isOpen, setIsOpen] = useState(items.length === 0);
  const { products, isLoading } = useProductsOptionsQuery({ enabled: isOpen });

  return (
    <ProductPicker
      items={items}
      onItemsChange={onItemsChange}
      products={products}
      isLoading={isLoading}
      collapsible
      openLabel={openLabel}
      priceOf={priceOf}
      closeLabel="بستن لیست کالاها"
      onPickerOpenChange={setIsOpen}
    />
  );
}
