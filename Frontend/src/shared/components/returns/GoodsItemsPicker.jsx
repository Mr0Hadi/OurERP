import { useMemo } from "react";
import ProductPicker from "@/shared/components/products/ProductPicker";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

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
 */
export default function GoodsItemsPicker({ items, onItemsChange }) {
  const { data: productsData, isLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );

  const products = useMemo(() => productsData?.items ?? [], [productsData]);

  return (
    <ProductPicker
      items={items}
      onItemsChange={onItemsChange}
      products={products}
      isLoading={isLoading}
      collapsible
      openLabel="انتخاب کالا برای ارسال"
      closeLabel="بستن لیست کالاها"
    />
  );
}
