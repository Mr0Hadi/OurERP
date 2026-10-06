import { PaymentTypeEnum, PAYMENT_REFERENCE_FIELDS } from "@/shared/domain/enums/paymentType";
import { ROW_PAYMENT_TYPES } from "@/shared/domain/payments/paymentSplit";
import {
  installmentDisplayStatus,
  isInstallmentUnpaid,
  SaleInstallmentStatusEnum,
} from "@/shared/domain/enums/saleInstallment";
import { todayIso } from "@/shared/lib/dateUtils";

/**
 * قرارداد اقساطیِ فروش — قواعدِ خالص (بی React، بی شبکه) برای فرمِ ثبت/ویرایش و
 * نمایش. مبالغِ قرارداد را **سرور** حساب می‌کند (`api-guide` بخش ۱۱ب)؛ اینجا فقط
 * پیش‌نمایشِ فرم پیش از ثبت است، مثلِ `invoice/lineMath.js`. بعد از ثبت همه‌جا عددِ سرور
 * نشان داده می‌شود.
 */

/** روش‌های پرداختِ پیش‌پرداخت و قسط: یک ردیفِ پول (نقدی، انتقال، چک)، نه ترکیبی. */
export const INSTALLMENT_PAYMENT_TYPES = ROW_PAYMENT_TYPES;

/**
 * پیشنهادهای تعدادِ اقساط. سرور هر عدد مثبتی را می‌پذیرد و سندش گفته فرانت چند گزینه‌ی
 * آماده نشان دهد؛ کاربر عددِ دلخواه هم می‌تواند بنویسد.
 */
export const INSTALLMENT_COUNT_PRESETS = Object.freeze([3, 6, 12, 18, 24]);

/** فیلدهای پرداختِ یک قسط/پیش‌پرداخت (`paymentType` + مرجع + تاریخ). */
export const EMPTY_INSTALLMENT_PAYMENT = Object.freeze({
  paymentType: PaymentTypeEnum.CASH,
  checkNumber: "",
  transferRef: "",
  paidAt: "",
});

/** پیش‌نویسِ فرمِ قرارداد (همان نام‌های `CreateSaleInstallmentPlanCommand`). */
export const EMPTY_PLAN_DRAFT = Object.freeze({
  markupPercentage: "",
  downPaymentAmount: null,
  installmentCount: "",
  firstDueDate: "",
  latePenaltyPercentage: "",
  ...EMPTY_INSTALLMENT_PAYMENT,
});

/**
 * همان `DateTime.AddMonths`ِ .NET روی "YYYY-MM-DD": روزِ ناموجود به آخرِ ماه می‌چسبد
 * (۳۱ ژانویه + ۱ ماه = ۲۸/۲۹ فوریه)، نه به ماهِ بعد سرریز کند.
 */
export function addMonthsIso(iso, months) {
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return todayIso(new Date(target.getFullYear(), target.getMonth(), Math.min(day, lastDay)));
}

const toNumber = (value) => (value === "" || value == null ? NaN : Number(value));

/**
 * درصدِ معتبر با همان دقتِ ستونِ سرور (`decimal(9,4)`: تا ۵ رقمِ صحیح و ۴ رقمِ اعشار) —
 * درصدی با اعشارِ بیشتر را سرور با دقتِ کامل حساب ولی گردشده ذخیره می‌کرد.
 */
const PERCENT_PATTERN = /^\d{1,5}(\.\d{1,4})?$/;
const validPercent = (value) => PERCENT_PATTERN.test(String(value ?? ""));

/**
 * سودِ اقساط بی خطای ممیزِ شناور: `round(cash × percent / 100)`، نیم به بالا (`decimal`ِ سرور).
 * `cash × 2.5 / 100` با `Number` گاهی `x.4999…` می‌شد و یک ریال کم گرد می‌کرد؛ درصد به
 * عددِ صحیح و توانِ ده شکسته و با `BigInt` دقیق حساب می‌شود. `percent` از `PERCENT_PATTERN`
 * گذشته است.
 */
function installmentCharge(cashAmount, percent) {
  const [whole, fraction = ""] = String(percent).split(".");
  const numerator = BigInt(cashAmount) * BigInt(whole + fraction);
  const denominator = 100n * 10n ** BigInt(fraction.length);
  return Number((2n * numerator + denominator) / (2n * denominator));
}

/**
 * پیش‌نمایشِ قرارداد با قاعده‌ی `InstallmentSchedule`ِ سرور: سود = گردِ نیم‌به‌بالای
 * `اصل × درصد / ۱۰۰`؛ هر قسط = تقسیمِ صحیحِ مانده بر تعداد و باقیمانده روی قسطِ آخر؛
 * سررسیدها ماهانه از اولین سررسید. `null` تا ورودی کامل نیست.
 *
 * @param cashAmount جمعِ فاکتور (پیش‌نمایشِ فرم؛ اصلِ قرارداد را سرور از فاکتور می‌خواند)
 */
export function previewInstallmentPlan(cashAmount, draft) {
  const cash = Math.round(Number(cashAmount) || 0);
  const count = toNumber(draft.installmentCount);
  const downPayment = Number(draft.downPaymentAmount) || 0;
  if (cash <= 0 || !validPercent(draft.markupPercentage) || !Number.isInteger(count) || count <= 0) return null;

  const installmentChargeAmount = installmentCharge(cash, draft.markupPercentage);
  const totalAmount = cash + installmentChargeAmount;
  const financedAmount = Math.max(0, totalAmount - downPayment);
  const installmentAmount = Math.floor(financedAmount / count);
  const installments = draft.firstDueDate
    ? Array.from({ length: count }, (_, index) => ({
        number: index + 1,
        dueDate: addMonthsIso(draft.firstDueDate, index),
        amount: index === count - 1 ? financedAmount - installmentAmount * (count - 1) : installmentAmount,
        status: SaleInstallmentStatusEnum.PENDING,
      }))
    : [];

  return {
    cashAmount: cash,
    installmentChargeAmount,
    totalAmount,
    downPaymentAmount: downPayment,
    financedAmount,
    installmentCount: count,
    installmentAmount,
    installments,
  };
}

/**
 * خطاهای فرمِ قرارداد، به‌شکلِ `{ field: message }` (خالی = بی‌خطا). همان قاعده‌های
 * validatorِ سرور، به‌اضافه‌ی «پیش‌پرداخت بیشتر از صفر» که صدورِ فاکتور به آن بسته است
 * (`withDownPayment`) — بدونِ پیش‌پرداخت فروش در پیش‌فاکتور می‌ماند.
 *
 * @param payable مبلغِ قابل پرداختِ پیش‌نمایش (`previewInstallmentPlan`)؛ فقط در ثبتِ تازه
 */
export function planDraftErrors(draft, { payable, withDownPayment = false } = {}) {
  const errors = {};
  if (draft.markupPercentage === "" || draft.markupPercentage == null) {
    errors.markupPercentage = "درصد سود را وارد کنید (۰ یعنی بدون سود)";
  } else if (!validPercent(draft.markupPercentage)) {
    errors.markupPercentage = "درصد باید عددی نامنفی با حداکثر ۴ رقمِ اعشار باشد";
  }
  const count = toNumber(draft.installmentCount);
  if (!Number.isInteger(count) || count <= 0) errors.installmentCount = "تعداد اقساط باید عددی بزرگ‌تر از صفر باشد";
  if (!draft.firstDueDate) errors.firstDueDate = "سررسید اولین قسط را انتخاب کنید";
  if (draft.latePenaltyPercentage !== "" && !validPercent(draft.latePenaltyPercentage)) {
    errors.latePenaltyPercentage = "درصد جریمه باید عددی نامنفی با حداکثر ۴ رقمِ اعشار باشد";
  }

  if (withDownPayment) {
    const downPayment = Number(draft.downPaymentAmount) || 0;
    // قاعده‌ی سرور برای صدور: پیش‌فاکتورِ اقساطی فقط با پیش‌پرداختِ بیشتر از صفر فاکتور می‌شود
    // (`CreateSaleInstallmentPlan`) و فروشِ حضوری صفر را رد می‌کند؛ قراردادِ بی‌پیش‌پرداخت فروش
    // را برای همیشه در پیش‌فاکتور نگه می‌داشت (`frontend-requests.fa.md` ۱۷.۵).
    if (downPayment <= 0) {
      errors.downPaymentAmount = "فاکتورِ اقساطی فقط با پیش‌پرداختِ بیشتر از صفر صادر می‌شود";
    }
    else if (payable != null && downPayment >= payable) {
      errors.downPaymentAmount = "پیش‌پرداخت باید از مبلغ قابل پرداخت کمتر باشد";
    }
    const paidAt = draft.paidAt || todayIso();
    if (draft.firstDueDate && draft.firstDueDate < paidAt) {
      errors.firstDueDate = "سررسید اولین قسط نمی‌تواند پیش از تاریخ پیش‌پرداخت باشد";
    }
  }
  return errors;
}

/** فیلدهای پرداخت برای بدنه‌ی API؛ مرجعِ چک/حواله فقط برای همان روش، تاریخِ خالی یعنی «الان». */
export function toApiInstallmentPayment(payment) {
  const reference = PAYMENT_REFERENCE_FIELDS[payment.paymentType];
  return {
    paymentType: payment.paymentType,
    checkNumber: reference?.field === "checkNumber" ? payment.checkNumber || null : null,
    transferRef: reference?.field === "transferRef" ? payment.transferRef || null : null,
    paidAt: payment.paidAt || null,
  };
}

const percentOrNull = (value) => (value === "" || value == null ? null : Number(value));

/** پیش‌نویس → بدنه‌ی `CreateSaleInstallmentPlan` (بی `saleId`؛ همان بدنه‌ی `installmentPlan`ِ فروشِ حضوری). */
export function toApiCreatePlan(draft) {
  return {
    markupPercentage: Number(draft.markupPercentage) || 0,
    downPaymentAmount: Number(draft.downPaymentAmount) || 0,
    installmentCount: Number(draft.installmentCount),
    firstDueDate: draft.firstDueDate,
    latePenaltyPercentage: percentOrNull(draft.latePenaltyPercentage),
    ...toApiInstallmentPayment(draft),
  };
}

/** قراردادِ سرور → پیش‌نویسِ فرمِ ویرایش (`UpdateSaleInstallmentPlan`). */
export function planEditDraftOf(plan) {
  return {
    markupPercentage: String(plan.markupPercentage ?? ""),
    installmentCount: String(plan.installmentCount ?? ""),
    firstDueDate: String(plan.nextDueDate ?? plan.firstDueDate ?? "").slice(0, 10),
    latePenaltyPercentage: plan.latePenaltyPercentage == null ? "" : String(plan.latePenaltyPercentage),
  };
}

export function toApiUpdatePlan(planId, draft) {
  return {
    id: planId,
    markupPercentage: Number(draft.markupPercentage) || 0,
    installmentCount: Number(draft.installmentCount),
    firstDueDate: draft.firstDueDate,
    latePenaltyPercentage: percentOrNull(draft.latePenaltyPercentage),
  };
}

/**
 * شمارش‌های نمایشیِ جدولِ اقساطِ یک قرارداد (پرداخت‌شده/مانده را خودِ سرور می‌دهد؛
 * اینجا فقط «چند قسط سررسیدش گذشته» و مبلغشان، که سرور ندارد).
 */
export function overdueOf(installments = [], today = todayIso()) {
  const overdue = installments.filter(
    (row) => installmentDisplayStatus(row, today) === SaleInstallmentStatusEnum.OVERDUE,
  );
  return { count: overdue.length, amount: overdue.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) };
}

/** اقساطی که هنوز پرداخت نشده‌اند (برای تسویه‌ی کامل). */
export const unpaidInstallments = (installments = []) =>
  installments.filter((row) => isInstallmentUnpaid(row.status));
