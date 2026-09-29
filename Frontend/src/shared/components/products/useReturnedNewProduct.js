import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useProductDetailLoader } from "@/features/warehouse/products/services/queries";
import { lineFromProduct } from "@/shared/domain/invoice/lineFromProduct";

/**
 * کالایی که کاربر از داخلِ فرمِ فاکتور ساخته (`state.newProductId` از صفحه‌ی
 * «کالای جدید») به اقلام اضافه می‌شود.
 *
 * جزئیاتِ کالا مستقیم با شناسه گرفته می‌شود، نه از لیستِ ۲۰۰تاییِ کالاها — آن لیست
 * هنگامِ برگشت هنوز کش قدیمی است (کالای تازه در آن نیست) و قیمتِ خرید را هم ندارد.
 *
 * @param {object} options
 * @param {() => object[]} options.getItems آخرین اقلامِ فرم (از استور، نه از رندر)
 * @param {(items: object[]) => void} options.setItems
 * @param {(product: object) => number} options.priceOf قیمتِ اولیه‌ی قلم
 */
export function useReturnedNewProduct({ getItems, setItems, priceOf }) {
  const location = useLocation();
  const navigate = useNavigate();
  const loadProductDetail = useProductDetailLoader();
  const newProductId = location.state?.newProductId;

  useEffect(() => {
    if (!newProductId) return undefined;
    let cancelled = false;

    loadProductDetail(newProductId).then((product) => {
      if (cancelled || !product) return;
      const items = getItems();
      if (!items.some((item) => item.productId === product.id)) {
        setItems([...items, lineFromProduct(product, { unitPrice: priceOf(product) })]);
      }
      // state پاک می‌شود تا رفرشِ صفحه کالا را دوباره اضافه نکند.
      navigate(location.pathname, { replace: true, state: {} });
    });

    return () => {
      cancelled = true;
    };
    // فقط با رسیدنِ شناسه‌ی تازه اجرا می‌شود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newProductId]);
}
