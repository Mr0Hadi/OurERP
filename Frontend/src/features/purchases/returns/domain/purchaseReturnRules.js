import {
  PURCHASE_RETURN_STATUSES,
  RESOLUTION_TYPES,
  RESOLUTION_TYPE_LABELS,
  SHORTAGE_RESOLUTION_TYPES,
  SURPLUS_RESOLUTION_TYPES,
  AMOUNT_BEARING_RESOLUTION_TYPES,
  WAREHOUSE_PENDING_RESOLUTION_TYPES,
  SHORTAGE_RETURN_REASON_LABELS,
  SURPLUS_RETURN_REASON_LABELS,
} from "../services/mockData";
import { SURPLUS_KINDS } from "@/shared/constants/purchaseIssueTypes";

// حذف کامل فقط تا وقتی هیچ تصمیمی برای هیچ قلمی ثبت نشده مجاز است
export function canDeletePurchaseReturn(purchaseReturn) {
  if (!purchaseReturn) return false;
  return purchaseReturn.status === PURCHASE_RETURN_STATUSES.PENDING;
}

// لغو صریح («لغو مرجوعی») هم فقط در همین حالت اولیه معنا دارد؛ بعد از
// اولین تصمیم، واحد خرید باید باقیمانده را با «پذیرش زیان» ببندد، نه
// کل مرجوعی را لغو کند (چون بخشی از آن ممکن است قبلاً روی خرید اثر
// گذاشته باشد).
export function canCancelPurchaseReturn(purchaseReturn) {
  if (!purchaseReturn) return false;
  return purchaseReturn.status === PURCHASE_RETURN_STATUSES.PENDING;
}

/**
 * نوع ادعای هر قلم مرجوعی. این محور تعیین می‌کند چه دلایلی و چه
 * تصمیم‌هایی برای آن قلم معنا دارند.
 *
 * ارزش رشته‌ای SHORTAGE همان "shortage" است که در PURCHASE_ISSUE_TYPES
 * هم وجود دارد، ولی این دو هیچ ربطی به هم ندارند و روی دو فیلد جدا
 * می‌نشینند: claimKind در برابر reason.
 */
export const CLAIM_KINDS = {
  SHORTAGE: "shortage",
  SURPLUS: "surplus",
};

/**
 * قلم‌های قدیمی (پیش از افزوده‌شدن مازاد) claimKind ندارند و همگی
 * کسری‌اند؛ همه‌ی توابع این ماژول باید از همین‌جا بخوانند تا هیچ‌کجا
 * لازم نباشد جداگانه fallback بنویسد.
 */
export function claimKindOf(item) {
  return item?.claimKind === CLAIM_KINDS.SURPLUS
    ? CLAIM_KINDS.SURPLUS
    : CLAIM_KINDS.SHORTAGE;
}

export function isSurplusClaim(item) {
  return claimKindOf(item) === CLAIM_KINDS.SURPLUS;
}

export function isUnknownItemClaim(item) {
  return isSurplusClaim(item) && item?.surplusKind === SURPLUS_KINDS.UNKNOWN;
}

/**
 * فقط ادعاهای کسری روی سقف سفارش می‌نشینند. مازاد بیرون از سفارش است
 * و نباید در هیچ محاسبه‌ای که به qty/receivedQty/settledQty خرید ربط
 * دارد شرکت کند — نه در «مقدار قابل دریافت» و نه در تسویه‌ی خطوط خرید.
 */
export function affectsOrderedQty(item) {
  return !isSurplusClaim(item);
}

export function resolutionTypesForClaim(item) {
  return isSurplusClaim(item)
    ? SURPLUS_RESOLUTION_TYPES
    : SHORTAGE_RESOLUTION_TYPES;
}

const labelsOf = (types) =>
  Object.fromEntries(types.map((type) => [type, RESOLUTION_TYPE_LABELS[type]]));

// یک‌بار ساخته می‌شوند تا مصرف‌کننده‌ها (که این نقشه را به‌عنوان prop
// به فرم می‌دهند) در هر رندر یک آبجکت تازه نسازند.
const SHORTAGE_RESOLUTION_TYPE_LABELS = labelsOf(SHORTAGE_RESOLUTION_TYPES);
const SURPLUS_RESOLUTION_TYPE_LABELS = labelsOf(SURPLUS_RESOLUTION_TYPES);

/**
 * نقشه‌ی برچسبِ محدودشده به همان خانواده — همان چیزی که فرم ثبت تصمیم
 * به‌عنوان گزینه‌های Select می‌گیرد.
 */
export function resolutionLabelsForClaim(item) {
  return isSurplusClaim(item)
    ? SURPLUS_RESOLUTION_TYPE_LABELS
    : SHORTAGE_RESOLUTION_TYPE_LABELS;
}

export function reasonLabelsForClaim(item) {
  return isSurplusClaim(item)
    ? SURPLUS_RETURN_REASON_LABELS
    : SHORTAGE_RETURN_REASON_LABELS;
}

/**
 * نوعی که در فرم ثبت تصمیم، فیلد مبلغ را نشان می‌دهد. برای کسری
 * «بازگشت وجه» و برای مازاد «نگهداری و تسویه» — دو جهتِ مخالفِ پول،
 * ولی هر دو یک فیلد مبلغ دارند.
 */
export function amountResolutionTypeForClaim(item) {
  return isSurplusClaim(item)
    ? RESOLUTION_TYPES.KEEP_AND_SETTLE
    : RESOLUTION_TYPES.REFUND;
}

export function isAmountBearingResolution(type) {
  return AMOUNT_BEARING_RESOLUTION_TYPES.includes(type);
}

/**
 * آیا این تصمیم تا انجام یک کار فیزیکی در انبار «در انتظار» می‌ماند؟
 * جایگزینی منتظر رسیدن کالاست و عودت منتظر خارج‌شدن آن.
 */
export function isWarehousePendingResolution(type) {
  return WAREHOUSE_PENDING_RESOLUTION_TYPES.includes(type);
}

/**
 * تصمیم‌هایی که یعنی «کالا پیش ما می‌ماند» — تنها حالتی که مازاد باید
 * وارد موجودی قابل‌فروش شود.
 */
export function isKeepResolution(type) {
  return (
    type === RESOLUTION_TYPES.KEEP_AND_SETTLE ||
    type === RESOLUTION_TYPES.SUPPLIER_WRITE_OFF
  );
}

/**
 * کالای ثبت‌نشده تا وقتی قرار است عودت داده شود به هیچ رکورد کالایی
 * نیاز ندارد؛ اما لحظه‌ای که تصمیم به نگهداری گرفته شود، باید به یک
 * کالای واقعی وصل شود وگرنه افزایش موجودی جایی برای نشستن ندارد.
 */
export function requiresProductLink(item, resolutionType) {
  return (
    isUnknownItemClaim(item) && isKeepResolution(resolutionType) && !item?.productId
  );
}
