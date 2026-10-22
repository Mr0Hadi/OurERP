import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";

/**
 * دریافت و پرداختِ علی‌الحساب — بخشِ پرداختیِ کنترلر `api/PartyAccount` (`api-guide.fa.md` بخش ۲۳).
 *
 * پولی که بی فاکتور از مشتری گرفته یا به تامین‌کننده داده می‌شود: همان لحظه مانده‌ی حسابِ شخص و صندوق/بانک را
 * عوض می‌کند. «تخصیص» بعداً بخشی از آن را به فاکتورهای همان شخص می‌زند — فقط دفترداری است و پولی جابه‌جا
 * نمی‌کند؛ `paidAmount`ِ فاکتور بالا می‌رود. همه‌ی نوشتن‌ها `PartyPaymentDto`ِ کامل برمی‌گردانند.
 */

/** `PartyPaymentListSortEnum`، بر اساسِ شناسه‌ی ستونِ جدول. */
export const PARTY_PAYMENT_SORT_COLUMNS = {
  paidAt: 0,
  amount: 1,
  partyName: 2,
  unallocatedAmount: 3,
};

/**
 * `GET GetPartyPaymentList` — فقط پرداخت‌های بی فاکتور: `customerId`، `supplierId`، `direction`، `bankAccountId`،
 * `hasUnallocated`، `fromDate`، `toDate`، `includeVoided`، `search`. ردیف‌ها بی `allocations`.
 */
export async function fetchPartyPayments(params) {
  const { data } = await axiosInstance.get("/PartyAccount/GetPartyPaymentList", { params });
  return normalizeListResponse(data, { itemsKey: "partyPaymentList" });
}

/** `GET GetPartyPaymentDetail` — با همه‌ی تخصیص‌ها (فعال و برداشته‌شده). */
export async function fetchPartyPayment(id) {
  const { data } = await axiosInstance.get("/PartyAccount/GetPartyPaymentDetail", { params: { id } });
  return data;
}

/**
 * `GET GetAllocatableDocumentList` — فاکتورهای بازِ یک شخص که الان می‌شود به آن‌ها تخصیص داد، قدیمی‌ترین
 * سررسید اول. دقیقاً یکی از `customerId`/`supplierId`.
 */
export async function fetchAllocatableDocuments({ customerId, supplierId }) {
  const { data } = await axiosInstance.get("/PartyAccount/GetAllocatableDocumentList", {
    params: { customerId: customerId || undefined, supplierId: supplierId || undefined },
  });
  return data ?? [];
}

/** `POST AddPartyPayment` — `allocations` اختیاری، در همان درخواست. */
export async function addPartyPayment(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post("/PartyAccount/AddPartyPayment", body, idempotent(idempotencyKey));
  return data;
}

/** `POST AllocatePartyPayment` — همه یا هیچ. */
export async function allocatePartyPayment(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post("/PartyAccount/AllocatePartyPayment", body, idempotent(idempotencyKey));
  return data;
}

/** `POST RemovePartyPaymentAllocation` — فاکتور دوباره بدهکار می‌شود؛ حسابِ شخص تکان نمی‌خورد. */
export async function removePartyPaymentAllocation(allocationId) {
  const { data } = await axiosInstance.post("/PartyAccount/RemovePartyPaymentAllocation", { allocationId });
  return data;
}

/** `POST VoidPartyPayment` — تا وقتی تخصیصِ فعال دارد ۴۰۰. */
export async function voidPartyPayment(paymentDetailId) {
  const { data } = await axiosInstance.post("/PartyAccount/VoidPartyPayment", { paymentDetailId });
  return data;
}
