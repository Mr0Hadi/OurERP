import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES, routeWithId } from "@/shared/constants/routes";

import { useProductFilterStore } from "../store/productFilterStore";

/**
 * وقتی کدِ تایپ‌شده کاملِ یک کالاست، مستقیم به جزئیاتش می‌رود.
 *
 * سرور تطبیقِ دقیقِ `code` را بر «شامل» مقدم می‌دارد، پس کدِ کامل دقیقاً یک
 * ردیف برمی‌گرداند؛ کدِ نیمه‌کاره چند ردیفِ مشابه می‌دهد و همان‌جا در لیست
 * می‌ماند. `filters.code` مقدارِ debounce‌شده است و نتیجه باید مالِ همان باشد،
 * نه placeholderِ درخواستِ قبلی. فیلد پیش از رفتن پاک می‌شود تا برگشت از
 * جزئیات دوباره به همان کالا نپرد.
 */
export function useOpenProductOnExactCode(query, filters) {
  const navigate = useNavigate();
  const typedCode = filters.code?.trim().toLowerCase();
  const items = query.data?.items;
  const match =
    typedCode && !query.isPlaceholderData && items?.length === 1 && items[0].code?.toLowerCase() === typedCode
      ? items[0]
      : null;
  const matchId = match?.id ?? null;

  useEffect(() => {
    if (matchId == null) return;
    useProductFilterStore.getState().setCode("");
    navigate(routeWithId(ROUTES.WAREHOUSE_PRODUCTS_DETAIL, matchId));
  }, [matchId, navigate]);
}
