import axiosInstance from "@/shared/services/api/axios";
import { idempotent, normalizeListResponse } from "@/shared/services/api/contract";

/**
 * کنترلر `api/SaleInstallment` (`Backend-Net/docs/api-guide.fa.md`، بخش ۱۱ب).
 *
 * یک فروشِ `INSTALLMENT` یک قرارداد (`SaleInstallmentPlan`) دارد و زیرش سطرهای قسط.
 * همه‌ی نوشتن‌ها سندِ کاملِ قرارداد را برمی‌گردانند (همان شکلِ `GetSaleInstallmentPlanDetail`)
 * و همه‌ی مبالغ را سرور حساب می‌کند. پولِ فروشِ اقساطی فقط از این مسیر جابه‌جا می‌شود
 * (`AddSalePayment` تا ابطالِ قرارداد ۴۰۰ می‌دهد).
 *
 *  - پرداختِ جزئی وجود ندارد: یک قسط = یک پرداختِ کامل به مبلغِ همان سطر + جریمه‌ی دیرکردش.
 *  - `OVERDUE` را سرویسِ پس‌زمینه‌ی سرور هر ساعت می‌نویسد (با مهلتِ ارفاق).
 *  - جریمه‌ی دیرکرد جزوِ `totalAmount`/`paidAmount`ِ قرارداد نیست؛ روی هر سطر `penaltyDue`
 *    (اگر امروز پرداخت شود) و `penaltyAmount` (گرفته‌شده) می‌آید.
 */

/** `SaleInstallmentListSortEnum`، بر اساسِ شناسه‌ی ستونِ جدول. */
export const INSTALLMENT_SORT_COLUMNS = {
  dueDate: 0,
  number: 1,
  amount: 2,
  status: 3,
  paidAt: 4,
  invoiceNumber: 5,
  customerName: 6,
};

/** `SaleInstallmentPlanListSortEnum`. */
export const INSTALLMENT_PLAN_SORT_COLUMNS = {
  planId: 0,
  createdAt: 1,
  invoiceNumber: 2,
  customerName: 3,
  totalAmount: 4,
  paidAmount: 5,
  remainingAmount: 6,
  nextDueDate: 7,
  status: 8,
};

/** قراردادِ جاریِ یک فروش (یا آخرینِ ابطال‌شده)؛ فروشِ بی‌قرارداد ۴۰۴. */
export async function fetchInstallmentPlan({ saleId, planId }) {
  const { data } = await axiosInstance.get("/SaleInstallment/GetSaleInstallmentPlanDetail", {
    params: planId ? { planId } : { saleId },
  });
  return data;
}

/** `GET GetSaleInstallmentPlanList` — `customerId`, `saleId`, `status`, بازه‌ی `nextDueDate`/`createdAt`. */
export async function fetchInstallmentPlans(params) {
  const { data } = await axiosInstance.get("/SaleInstallment/GetSaleInstallmentPlanList", { params });
  return normalizeListResponse(data, { itemsKey: "saleInstallmentPlanList" });
}

/** `GET GetSaleInstallmentList` — تک‌تکِ اقساطِ کلِ سیستم؛ `customerId`, `status`, بازه‌ی `dueDate`/`paidAt`. */
export async function fetchInstallments(params) {
  const { data } = await axiosInstance.get("/SaleInstallment/GetSaleInstallmentList", { params });
  return normalizeListResponse(data, { itemsKey: "saleInstallmentList" });
}

/**
 * ثبتِ قرارداد و پیش‌پرداخت. پیش‌پرداختِ بیشتر از صفر پیش‌فاکتور را همین‌جا فاکتور می‌کند
 * (شماره، تاریخ، «آماده‌سازی انبار»).
 */
export async function createInstallmentPlan(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/SaleInstallment/CreateSaleInstallmentPlan",
    body,
    idempotent(idempotencyKey),
  );
  return data;
}

/** فقط بخشِ پرداخت‌نشده بازسازی می‌شود؛ پیش‌پرداخت و اصلِ قرارداد عوض نمی‌شوند. */
export async function updateInstallmentPlan(body) {
  const { data } = await axiosInstance.put("/SaleInstallment/UpdateSaleInstallmentPlan", body);
  return data;
}

/** ابطال: اقساطِ پرداخت‌نشده لغو می‌شوند؛ پرداخت‌های ثبت‌شده می‌مانند. */
export async function cancelInstallmentPlan(id) {
  const { data } = await axiosInstance.delete("/SaleInstallment/DeleteSaleInstallmentPlan", {
    params: { id },
  });
  return data;
}

/** پرداختِ یک قسطِ کامل؛ مبلغ (قسط + جریمه‌ی دیرکرد) را سرور از خودِ سطر حساب می‌کند. */
export async function payInstallment(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/SaleInstallment/PaySaleInstallment",
    body,
    idempotent(idempotencyKey),
  );
  return data;
}

/**
 * تسویه‌ی کامل: همه‌ی مانده یکجا. سرور سودِ اقساطِ سررسیدنشده را به اندازه‌ی تنظیمِ
 * `Installment.EarlySettlementDiscountPercentage` می‌بخشد و جریمه‌ی اقساطِ دیرشده را اضافه می‌کند.
 */
export async function settleInstallmentPlan(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/SaleInstallment/SettleSaleInstallmentPlan",
    body,
    idempotent(idempotencyKey),
  );
  return data;
}

/**
 * `POST WaiveSaleInstallmentPenalty` — بخشودگیِ جریمه‌ی یک قسطِ پرداخت‌نشده (`amount` ریال؛ جایگزینِ
 * بخشودگیِ قبلی، `0` = برداشتن). برای مبلغِ بیش از صفر `reason` الزامی است. دسترسی
 * `SaleInstallmentPenaltyWaive`. خروجی سندِ کاملِ قرارداد.
 */
export async function waiveInstallmentPenalty(body) {
  const { data } = await axiosInstance.post("/SaleInstallment/WaiveSaleInstallmentPenalty", body);
  return data;
}
