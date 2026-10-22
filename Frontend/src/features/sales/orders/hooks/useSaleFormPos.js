import { useRef, useState } from "react";

import { ensureProformaPaymentType, useSalePosActions } from "../services/mutations";
import { newPosReference } from "@/shared/domain/pos/posSession";

/**
 * «دریافت با کارتخوان» روی پیش‌فاکتورِ «آماده‌ی پرداخت» — پیکربندیِ `posPayment`ِ `PaymentsCard`.
 * فروشِ تازه پول نمی‌گیرد (اول ثبت می‌شود)، پس کارتخوان فقط روی پیش‌فاکتورِ ذخیره‌شده است.
 *
 * پیش از کارت‌کشیدن تغییرهای بی‌اثر بر چرخه (توضیح، پیوست) ذخیره می‌شوند (`snapshot.infoChanges`)؛
 * بعد `AddSalePayment` فاکتور را صادر می‌کند. رسید تا «بستن» می‌ماند و بعد صفحه‌ی فاکتور باز می‌شود.
 * کارتخوان همان لحظه ثبت می‌شود و تحویلِ حضوری را انجام نمی‌دهد: دانه‌های رزرو برای ارسالِ انبار
 * می‌مانند.
 *
 * @param enabled       کاربر `PosCharge` دارد
 * @param sale          پیش‌فاکتورِ ثبت‌شده؛ خالی ⇒ کارتخوانی نیست
 * @param blockedReason چرا الان نمی‌شود کارت کشید (یا `undefined`)
 * @param takeSnapshot  پیش از ارسال به دستگاه: اعتبارسنجی (خطا ⇒ کارت نمی‌خورد) و `{ paymentType, infoChanges }`
 *                      — شیوه‌ی پرداختِ انتخاب‌شده پیش از کارت ثبت می‌شود (`ensureProformaPaymentType`)
 * @param onIssued      `() => void` — بعد از «بستن»ِ رسید (پیش از `apply`)
 * @returns `{ posPayment, posLocked }` — `posLocked`: تا پایانِ کار دکمه‌ی اصلی بسته است
 */
export function useSaleFormPos({ enabled, sale, blockedReason, takeSnapshot, onIssued }) {
  const posActions = useSalePosActions();
  const [posLocked, setPosLocked] = useState(false);
  // سندِ صادرشده تا «بستن»ِ رسید.
  const outcomeRef = useRef(null);

  if (!enabled || !sale) return { posPayment: undefined, posLocked };

  const posPayment = {
    prepare: async () => {
      outcomeRef.current = null;
      const { paymentType, infoChanges } = takeSnapshot();
      await ensureProformaPaymentType(sale, paymentType);
      await posActions.saveInfo(sale.id, infoChanges);
    },
    record: (_result, context) => posActions.recordPayment(sale.id, context),
    onRecorded: (latest) => {
      outcomeRef.current = latest;
    },
    onDone: () => {
      onIssued();
      posActions.apply(outcomeRef.current);
    },
    onLockChange: setPosLocked,
    reference: () => newPosReference(`sale-${sale.id}`),
    doneLabel: "مشاهده‌ی فاکتور",
    blockedReason,
    hint: "با تأییدِ کارتخوان فاکتور صادر می‌شود.",
  };

  return { posPayment, posLocked };
}
