import axiosInstance from "@/shared/services/api/axios";
import { idempotent } from "@/shared/services/api/contract";

/**
 * `GET api/Reorder/GetReorderSuggestionList` — کالاهایی که «موجودی آزاد + در راه» آن‌ها به نقطه‌ی سفارش رسیده
 * (بخش ۲۷ سند). صفحه‌بندی ندارد؛ ترتیب: تامین‌کننده، بعد نامِ کالا.
 * فیلترها: `supplierId`، `productCategoryId`، `search` (نام، کد یا برند).
 */
export async function fetchReorderSuggestions(
  { supplierId, productCategoryId, search },
  { signal } = {},
) {
  const { data } = await axiosInstance.get(
    "/Reorder/GetReorderSuggestionList",
    {
      params: {
        supplierId: supplierId || undefined,
        productCategoryId: productCategoryId || undefined,
        search: search?.trim() || undefined,
      },
      signal,
    },
  );
  return data ?? [];
}

/**
 * `POST api/Reorder/CreatePurchaseDraftsFromReorder` — برای هر تامین‌کننده یک پیش‌فاکتورِ خرید؛ همه یا هیچ.
 * `{ lines: [{ productId, supplierId, quantity, unitPrice }] }` ⇒ `[{ supplierId, purchaseId }]`.
 */
export async function createPurchaseDraftsFromReorder(
  body,
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/Reorder/CreatePurchaseDraftsFromReorder",
    body,
    idempotent(idempotencyKey),
  );
  return data ?? [];
}
