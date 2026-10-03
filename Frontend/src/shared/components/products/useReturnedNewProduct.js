import { useEffect } from "react";

import { useProductDetailLoader } from "@/features/warehouse/products/services/queries";
import { lineFromProduct } from "@/shared/domain/invoice/lineFromProduct";

/**
 * کالایی که کاربر از داخلِ فرمِ فاکتور ساخته به اقلام اضافه می‌شود.
 * `productId` همان `newProductId`ی است که صفحه‌ی «کالای جدید» برمی‌گرداند
 * (`useSubPageNavigation().returned`).
 *
 * جزئیاتِ کالا مستقیم با شناسه گرفته می‌شود، نه از لیستِ ۲۰۰تاییِ کالاها — آن لیست
 * هنگامِ برگشت هنوز کش قدیمی است (کالای تازه در آن نیست) و قیمتِ خرید را هم ندارد.
 *
 * @param {object} options
 * @param {number|null} options.productId
 * @param {() => object[]} options.getItems آخرین اقلامِ فرم (از استور، نه از رندر)
 * @param {(items: object[]) => void} options.setItems
 * @param {(product: object) => number} options.priceOf قیمتِ اولیه‌ی قلم
 */
export function useReturnedNewProduct({ productId, getItems, setItems, priceOf }) {
  const loadProductDetail = useProductDetailLoader();

  useEffect(() => {
    if (!productId) return undefined;
    let cancelled = false;

    loadProductDetail(productId).then((product) => {
      if (cancelled || !product) return;
      const items = getItems();
      if (!items.some((item) => item.productId === product.id)) {
        setItems([...items, lineFromProduct(product, { unitPrice: priceOf(product) })]);
      }
    });

    return () => {
      cancelled = true;
    };
    // فقط با رسیدنِ شناسه‌ی تازه اجرا می‌شود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);
}
