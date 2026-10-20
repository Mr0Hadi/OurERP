import { useRef, useState } from "react";

import { useInPersonSaleMutation, useSalePosActions } from "../services/mutations";
import { newPosReference } from "@/shared/domain/pos/posSession";
import { rowsTotal } from "@/shared/domain/payments/paymentSplit";

/**
 * «دریافت با کارتخوان» در فرمِ فروش — پیکربندیِ `posPayment`ِ `PaymentsCard`.
 *
 * دریافت فقط دو جا ممکن است (چرخه‌ی تأیید، ۲۰۲۶-۱۰-۱۶):
 *  - فروشِ حضوریِ تازه: خودِ تأیید «ثبت» است؛ کلِ چرخه (`useInPersonSaleMutation`) با
 *    دریافت‌های فرم به‌اضافه‌ی تکه‌ی کارتخوان اجرا می‌شود. کلِ مبلغ ⇒ تحویلِ همان‌جا؛ کمتر ⇒
 *    فاکتور با همان دریافت‌ها صادر و کالا رزرو برای ارسالِ انبار (پولِ کشیده‌شده گم نمی‌شود).
 *  - پیش‌فاکتورِ «آماده‌ی پرداخت»: `AddSalePayment` فاکتور را صادر می‌کند. پیش‌فاکتورِ
 *    تغییرکرده یا دریافت‌های ثبت‌نشده‌ی دیگر مانع‌اند (ذخیره‌ی تغییر تأییدها را برمی‌گرداند).
 *
 * ثبت از روی *نسخه‌ای* از فرم است که پیش از کارت‌کشیدن اعتبارسنجی شد (`snapshot`)؛ «ثبتِ
 * دوباره» همان بدنه را می‌فرستد و کلیدِ ایدمپوتنسی از محتواست.
 *
 * @param enabled         کاربر `PosCharge` دارد
 * @param sale            پیش‌فاکتورِ ثبت‌شده؛ خالی برای فروشِ تازه
 * @param isInPerson      فروشِ تازه‌ی حضوری (دانه اسکن شده)
 * @param blockedReason   چرا الان روی پیش‌فاکتور نمی‌شود کارت کشید (یا `undefined`)
 * @param takeSnapshot    پیش از ارسال به دستگاه: اعتبارسنجی (خطا ⇒ کارت نمی‌خورد) و
 *                        `{ payload, draftRows, scannedBarcodes, total }`
 * @param onPersisted     `() => void` — فروشِ تازه همین الان روی سرور ساخته شد
 * @param onCreated       `(created) => void` — بعد از «بستن»ِ رسیدِ فروشِ تازه
 * @param onIssued        `() => void` — بعد از «بستن»ِ رسیدِ پیش‌فاکتورِ صادرشده (پیش از `apply`)
 * @returns `{ posPayment, posLocked }` — `posLocked`: تا پایانِ کار دکمه‌ی اصلی بسته است
 */
export function useSaleFormPos({
  enabled,
  sale,
  isInPerson,
  blockedReason,
  takeSnapshot,
  onPersisted,
  onCreated,
  onIssued,
}) {
  const inPersonMutation = useInPersonSaleMutation();
  const posActions = useSalePosActions();
  const [posLocked, setPosLocked] = useState(false);
  // `snapshot` سندی که پیش از کارت‌کشیدن اعتبارسنجی شد؛ `outcome` سندِ ساخته/صادرشده تا «بستن»ِ رسید.
  const runRef = useRef({ snapshot: null, outcome: null });

  if (!enabled || (!sale && !isInPerson)) return { posPayment: undefined, posLocked };

  const prepare = () => {
    runRef.current = { snapshot: takeSnapshot(), outcome: null };
    return runRef.current.snapshot;
  };

  const posPayment = !sale
    ? {
        prepare,
        record: async (_result, { rows }) => {
          const { payload, draftRows, scannedBarcodes, total } = runRef.current.snapshot;
          const paymentRows = [...draftRows, ...rows];
          const created = await inPersonMutation.mutateAsync({
            payload,
            scannedBarcodes,
            paymentRows,
            deliver: rowsTotal(paymentRows) >= total,
          });
          runRef.current.outcome = created;
          onPersisted?.();
          return created;
        },
        reference: () => newPosReference("sale-new"),
        onDone: () => onCreated(runRef.current.outcome),
        onLockChange: setPosLocked,
        doneLabel: "مشاهده‌ی فاکتور",
        hint: "فروشِ حضوری فقط با دریافتِ کلِ مبلغ همین‌جا تحویل می‌شود؛ وگرنه فاکتور صادر و کالا برای ارسالِ انبار رزرو می‌ماند.",
      }
    : {
        prepare,
        record: (_result, context) => posActions.recordPayment(sale.id, context),
        onRecorded: (latest) => {
          runRef.current.outcome = latest;
        },
        onDone: () => {
          onIssued();
          posActions.apply(runRef.current.outcome);
        },
        onLockChange: setPosLocked,
        reference: () => newPosReference(`sale-${sale.id}`),
        doneLabel: "مشاهده‌ی فاکتور",
        blockedReason,
        hint: "با تأییدِ کارتخوان فاکتور صادر می‌شود.",
      };

  return { posPayment, posLocked };
}
