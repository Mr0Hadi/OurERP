import { PURCHASE_RETURN_STATUSES } from "../services/mockData";

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