import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";
import { PAYMENT_REFERENCE_FIELDS, PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { ROW_PAYMENT_TYPES } from "@/shared/domain/payments/paymentSplit";
import { takesBankAccount } from "@/shared/domain/payments/paymentRows";

/**
 * دریافت/پرداختِ علی‌الحساب و تخصیص — قواعدِ خالص (بی React، بی شبکه)، همان قاعده‌های
 * `AddPartyPaymentCommand`/`AllocatePartyPaymentCommand` تا ۴۰۰ پیش از ارسال دیده شود.
 */

/** طرفِ حساب در فرم؛ روی سیم `customerId` یا `supplierId` است. */
export const PARTY_KIND = Object.freeze({ CUSTOMER: "customer", SUPPLIER: "supplier" });

/** جهتِ طبیعی: از مشتری دریافت، به تامین‌کننده پرداخت. فقط این جهت تخصیص می‌گیرد. */
export const naturalDirection = (partyKind) =>
  partyKind === PARTY_KIND.SUPPLIER ? PaymentDirectionEnum.OUT : PaymentDirectionEnum.IN;

/** برچسبِ هر جهت از دیدِ همان طرف. */
export function directionLabel(partyKind, direction) {
  const natural = direction === naturalDirection(partyKind);
  if (partyKind === PARTY_KIND.SUPPLIER) return natural ? "پرداخت به تامین‌کننده" : "برگشتِ پول از تامین‌کننده";
  return natural ? "دریافت از مشتری" : "برگرداندنِ پول به مشتری";
}

/** برچسبِ کوتاهِ جهت برای فهرست‌ها (از دیدِ ما). */
export const DIRECTION_SHORT_LABELS = Object.freeze({
  [PaymentDirectionEnum.IN]: "دریافت",
  [PaymentDirectionEnum.OUT]: "پرداخت",
});

export const partyKindOf = (payment) => (payment?.supplierId ? PARTY_KIND.SUPPLIER : PARTY_KIND.CUSTOMER);

/** روش‌ها: پولی که همان لحظه جابه‌جا می‌شود (نسیه علی‌الحساب بی‌معناست). */
export const PARTY_PAYMENT_TYPES = ROW_PAYMENT_TYPES;

export const emptyPartyPaymentDraft = ({ customerId = null, supplierId = null } = {}) => ({
  partyKind: supplierId ? PARTY_KIND.SUPPLIER : PARTY_KIND.CUSTOMER,
  partyId: supplierId ?? customerId,
  direction: naturalDirection(supplierId ? PARTY_KIND.SUPPLIER : PARTY_KIND.CUSTOMER),
  type: PaymentTypeEnum.CASH,
  amount: null,
  paidAt: "",
  checkNumber: "",
  transferRef: "",
  bankAccountId: null,
  description: "",
});

export function partyPaymentDraftErrors(draft) {
  const errors = {};
  if (!draft.partyId) errors.partyId = draft.partyKind === PARTY_KIND.SUPPLIER ? "تامین‌کننده را انتخاب کنید" : "مشتری را انتخاب کنید";
  if (!(draft.amount > 0)) errors.amount = "مبلغ باید از صفر بیشتر باشد";
  if (draft.description.trim().length > 500) errors.description = "شرح حداکثر ۵۰۰ نویسه است";
  return errors;
}

/** بدنه‌ی `AddPartyPayment`؛ مرجع و صندوق/حساب فقط برای روش‌های خودشان. */
export function toApiPartyPayment(draft, allocations = []) {
  const reference = PAYMENT_REFERENCE_FIELDS[draft.type];
  const isSupplier = draft.partyKind === PARTY_KIND.SUPPLIER;
  return {
    customerId: isSupplier ? null : draft.partyId,
    supplierId: isSupplier ? draft.partyId : null,
    direction: draft.direction,
    type: draft.type,
    amount: draft.amount,
    paidAt: draft.paidAt || null,
    checkNumber: reference?.field === "checkNumber" ? draft.checkNumber || null : null,
    transferRef: reference?.field === "transferRef" ? draft.transferRef || null : null,
    bankAccountId: takesBankAccount(draft.type) ? draft.bankAccountId || null : null,
    description: draft.description.trim() || null,
    allocations,
  };
}

// ─── تخصیص ─────────────────────────────────────────────────────────────────

/** کلیدِ یکتای یک فاکتورِ قابلِ تخصیص (فروش و خرید شناسه‌ی مشترک ندارند). */
export const documentKey = (doc) => (doc.saleId ? `sale-${doc.saleId}` : `purchase-${doc.purchaseId}`);

/** پیش‌نویسِ تخصیص: `{ [documentKey]: amount }`؛ مبلغِ خالی یا صفر یعنی «به این فاکتور نه». */
export const EMPTY_ALLOCATION_DRAFT = Object.freeze({});

/** پرکردنِ خودکار: قدیمی‌ترین سررسید اول (همان ترتیبِ سرور)، تا جایی که `available` اجازه دهد. */
export function autoAllocate(documents, available) {
  let left = Math.max(0, Number(available) || 0);
  const draft = {};
  for (const doc of documents) {
    if (left <= 0) break;
    const amount = Math.min(left, Number(doc.remainingAmount) || 0);
    if (amount > 0) {
      draft[documentKey(doc)] = amount;
      left -= amount;
    }
  }
  return draft;
}

export const allocatedTotal = (draft) =>
  Object.values(draft).reduce((sum, amount) => sum + (Number(amount) || 0), 0);

/** خطای هر ردیف (بیش از مانده‌ی فاکتور) و جمع (بیش از تخصیص‌نیافته)؛ `{ rows: {key: msg}, total? }`. */
export function allocationErrors(documents, draft, available) {
  const rows = {};
  for (const doc of documents) {
    const amount = Number(draft[documentKey(doc)]) || 0;
    if (amount > (Number(doc.remainingAmount) || 0)) rows[documentKey(doc)] = "بیشتر از مانده‌ی فاکتور";
  }
  const total = allocatedTotal(draft) > (Number(available) || 0) ? "جمعِ تخصیص از مبلغِ قابلِ تخصیص بیشتر است" : null;
  return { rows, total };
}

export const hasAllocationErrors = (errors) => Object.keys(errors.rows).length > 0 || Boolean(errors.total);

/** پیش‌نویس → `allocations[]`ِ API؛ ردیف‌های صفر فرستاده نمی‌شوند. */
export function toApiAllocations(documents, draft) {
  return documents
    .map((doc) => ({ doc, amount: Number(draft[documentKey(doc)]) || 0 }))
    .filter(({ amount }) => amount > 0)
    .map(({ doc, amount }) => ({ saleId: doc.saleId ?? null, purchaseId: doc.purchaseId ?? null, amount }));
}

/** تخصیصِ فعال (برداشته‌نشده). */
export const isActiveAllocation = (allocation) => !allocation.voidedAt;
