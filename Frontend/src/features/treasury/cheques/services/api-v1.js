import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";

/**
 * کنترلر `api/Check` (`api-guide.fa.md` بخش ۲۴): هر ردیفِ پرداختِ `CHECK` یک چک است — دریافتی (`IN`) یا صادره/خرج‌شده
 * (`OUT`)، روی فاکتور، قسط یا علی‌الحساب. `id`ِ چک همان شناسه‌ی ردیفِ پرداخت است. چکِ در جریان در مانده‌ی هیچ
 * صندوق/بانکی نیست؛ وصول آن را در تاریخِ وصول وارد می‌کند. همه‌ی نوشتن‌ها چک (`ChequeDto`) برمی‌گردانند.
 */

/** `CheckListSortEnum`، بر اساسِ شناسه‌ی ستونِ جدول. */
export const CHEQUE_SORT_COLUMNS = {
  checkDueDate: 0,
  amount: 1,
  paidAt: 2,
  partyName: 3,
};

/**
 * `GET GetCheckList` — `direction`، `statuses` (چندتایی)، بازه‌ی سررسید، `customerId`، `supplierId`، `bankAccountId`،
 * `includeVoided`، `search`. `summary` روی کلِ فیلتر است (چک‌های در جریان و سررسیدگذشته).
 */
export async function fetchCheques(params) {
  const { data } = await axiosInstance.get("/Check/GetCheckList", { params });
  return { ...normalizeListResponse(data, { itemsKey: "checkList" }), summary: data?.summary ?? null };
}

/** `POST CashCheck` — وصول؛ `bankAccountId` برای چکی که حساب ندارد الزامی. `cashedAt` خالی = اکنون. */
export async function cashCheque(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post("/Check/CashCheck", body, idempotent(idempotencyKey));
  return data;
}

/** `POST BounceCheck` — برگشت: پرداخت برمی‌گردد و طرف دوباره بدهکار/بستانکار می‌شود. */
export async function bounceCheque(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post("/Check/BounceCheck", body, idempotent(idempotencyKey));
  return data;
}

/** `POST EndorseCheck` — خرج کردنِ چکِ دریافتی به تامین‌کننده؛ `purchaseId` خالی = علی‌الحساب. خروجی ردیفِ تازه‌ی `OUT`. */
export async function endorseCheque(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post("/Check/EndorseCheck", body, idempotent(idempotencyKey));
  return data;
}
