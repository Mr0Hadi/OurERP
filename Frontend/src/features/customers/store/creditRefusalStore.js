import { create } from "zustand";

import { creditRefusalOf } from "../domain/creditLimit";

/**
 * آخرین ردِ «سقفِ اعتبار» از سرور، برای `CreditLimitRefusalDialog` که در `AppLayout` نشسته است. هر mutationِ صادرکننده‌ی
 * فاکتور (دریافت، فاکتورِ نسیه، قرارداد اقساط، تحویلِ حضوری، تخصیصِ علی‌الحساب) خطایش را با `reportCreditRefusal` می‌دهد.
 */
export const useCreditRefusalStore = create((set) => ({
  refusal: null,
  show: (refusal) => set({ refusal }),
  close: () => set({ refusal: null }),
}));

/**
 * اگر خطا ردِ سقفِ اعتبار است، دیالوگِ آن را باز می‌کند و `true` می‌دهد (فراخوان دیگر toast نمی‌زند).
 * @param error خطای axios
 */
export function reportCreditRefusal(error) {
  const refusal = creditRefusalOf(error);
  if (!refusal) return false;
  useCreditRefusalStore.getState().show(refusal);
  return true;
}
