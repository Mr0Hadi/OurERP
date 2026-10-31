import { ChequeStatusEnum } from "@/shared/domain/enums/chequeStatus";
import { PaymentDirectionEnum, PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * چرخه‌ی چک — کدام کار روی کدام چک مجاز است، همان قاعده‌های `CashCheck`/`BounceCheck`/`EndorseCheck`ِ سرور.
 */

/**
 * فقط چکِ در جریان (`PENDING`) سرنوشت می‌گیرد. `ChequeDto` تاریخِ ابطال ندارد؛ چکِ در جریانی که ابطال شده (فقط با
 * `includeVoided` می‌آید) را سرور خودش رد می‌کند.
 */
const isOpen = (cheque) => Number(cheque.status) === ChequeStatusEnum.PENDING;

export const canCashCheque = isOpen;

/** چکِ پیش‌پرداختِ قرارداد اقساطی از این مسیر برگشت نمی‌خورد (قرارداد ابطال و دوباره ثبت می‌شود). */
export const canBounceCheque = (cheque) =>
  isOpen(cheque) && Number(cheque.purpose) !== PaymentPurposeEnum.INSTALLMENT_DOWN_PAYMENT;

/** فقط چکِ دریافتی خرج می‌شود. */
export const canEndorseCheque = (cheque) => isOpen(cheque) && cheque.direction === PaymentDirectionEnum.IN;

/**
 * وصول حساب لازم دارد مگر چک خودش حساب داشته باشد (چکِ صادره معمولاً دارد) یا چکِ خرج‌شده باشد (تامین‌کننده وصولش
 * می‌کند و حسابِ ما نادیده گرفته می‌شود).
 */
export const cashNeedsAccount = (cheque) => !cheque.bankAccountId && !cheque.endorsedFromPaymentDetailId;
export const isEndorsedOut = (cheque) => Boolean(cheque.endorsedFromPaymentDetailId);

/** «۱۰ روز مانده»، «امروز»، «۳ روز گذشته»؛ `null` وقتی سرور روزی نداد. */
export function dueText(daysToDue) {
  if (daysToDue == null) return null;
  if (daysToDue === 0) return "امروز";
  return daysToDue > 0 ? `${formatNumber(daysToDue)} روز مانده` : `${formatNumber(-daysToDue)} روز گذشته`;
}

export const CHEQUE_DIRECTION_LABELS = Object.freeze({
  [PaymentDirectionEnum.IN]: "دریافتی",
  [PaymentDirectionEnum.OUT]: "پرداختی",
});
