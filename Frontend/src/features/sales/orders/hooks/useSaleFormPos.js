import { useRef, useState } from "react";

import { useCreateInPersonSaleMutation, useCreateSaleMutation, useSalePosActions } from "../services/mutations";
import { newPosReference } from "@/shared/domain/pos/posSession";
import { paymentTypeOf } from "@/shared/domain/payments/paymentRows";
import { rowsTotal } from "@/shared/domain/payments/paymentSplit";

/**
 * «دریافت با کارتخوان» در فرمِ فروش — پیکربندیِ `posPayment`ِ `PaymentsCard`.
 *
 * رسید تا «بستن» می‌ماند و بعد صفحه‌ی فروشِ صادرشده باز می‌شود.
 *  - فاکتورِ تازه: خودِ تأیید «ثبتِ فاکتور» است؛ فروش با دریافت‌های فرم به‌اضافه‌ی تکه‌ی
 *    کارتخوان ساخته می‌شود. حضوری فقط با دریافتِ کامل تحویل می‌شود؛ ناقص، فاکتورِ معمولی
 *    («در حال آماده‌سازی») بدونِ دانه‌های اسکن‌شده است (بند ۱۱.۴ درخواست‌های بکند).
 *  - پیش‌فاکتورِ ثبت‌شده: تغییراتش پیش از کارت‌کشیدن ذخیره می‌شود و دریافت آن را فاکتور
 *    می‌کند. دریافت‌های ثبت‌نشده‌ی دیگر باید اول ذخیره شوند (وگرنه با رفتن به فاکتور گم می‌شوند).
 *
 * ثبت از روی *نسخه‌ای* از فرم است که پیش از کارت‌کشیدن اعتبارسنجی شد (`snapshot`)، نه
 * فرمی که شاید وسطِ کار عوض شده. «ثبتِ دوباره» همان بدنه را می‌فرستد و چون کلیدِ
 * ایدمپوتنسی از محتواست، فروشِ دوم ساخته نمی‌شود.
 *
 * @param enabled      کاربر `PosCharge` دارد
 * @param sale         پیش‌فاکتورِ ثبت‌شده؛ خالی برای فروشِ تازه
 * @param takeSnapshot پیش از ارسال به دستگاه: اعتبارسنجی (خطا ⇒ کارت نمی‌خورد) و
 *                     `{ payload, draftRows, inPerson, scannedBarcodes, total }`
 * @param onPersisted  `() => void` — فروشِ تازه همین الان روی سرور ساخته شد (مثلاً نگه‌داشتنِ پیوست‌ها)
 * @param onCreated    `(created) => void` — بعد از «بستن»ِ رسیدِ فروشِ تازه
 * @param onIssued     `() => void` — بعد از «بستن»ِ رسیدِ پیش‌فاکتورِ صادرشده (پیش از `apply`)
 * @returns `{ posPayment, posLocked }` — `posLocked`: تا پایانِ کار دکمه‌ی اصلی بسته است
 */
export function useSaleFormPos({
  enabled,
  sale,
  takeSnapshot,
  hasDraftPayments,
  isInPerson,
  onPersisted,
  onCreated,
  onIssued,
}) {
  const createMutation = useCreateSaleMutation();
  const inPersonMutation = useCreateInPersonSaleMutation();
  const posActions = useSalePosActions();
  const [posLocked, setPosLocked] = useState(false);
  // `snapshot` سندی که پیش از کارت‌کشیدن اعتبارسنجی شد؛ `outcome` سندِ ساخته/صادرشده تا «بستن»ِ رسید.
  const runRef = useRef({ snapshot: null, outcome: null });

  if (!enabled) return { posPayment: undefined, posLocked };

  const prepare = () => {
    runRef.current = { snapshot: takeSnapshot(), outcome: null };
    return runRef.current.snapshot;
  };

  const posPayment = !sale
    ? {
        prepare,
        record: async (_result, { rows }) => {
          const { payload, draftRows, inPerson, scannedBarcodes, total } = runRef.current.snapshot;
          const paymentRows = [...draftRows, ...rows];
          const body = { ...payload, paymentType: paymentTypeOf(paymentRows), paymentRows };
          const created =
            inPerson && rowsTotal(paymentRows) >= total
              ? await inPersonMutation.mutateAsync({ payload: body, scannedBarcodes })
              : await createMutation.mutateAsync(body);
          runRef.current.outcome = created;
          onPersisted?.();
          return created;
        },
        reference: () => newPosReference("sale-new"),
        onDone: () => onCreated(runRef.current.outcome),
        onLockChange: setPosLocked,
        doneLabel: "مشاهده‌ی فاکتور",
        hint: isInPerson
          ? "فروشِ حضوری فقط با دریافتِ کلِ مبلغ تحویل می‌شود؛ وگرنه فاکتور «در حال آماده‌سازی» ثبت می‌شود."
          : "با تأییدِ کارتخوان، فاکتور همین‌جا ثبت می‌شود.",
      }
    : {
        prepare: async () => {
          const { payload } = prepare();
          await posActions.saveProforma(sale.id, payload);
        },
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
        blockedReason: hasDraftPayments
          ? "دریافت‌های ثبت‌نشده را اول ذخیره کنید؛ بعد از صفحه‌ی فاکتور با کارتخوان دریافت کنید."
          : undefined,
        hint: "تغییراتِ پیش‌فاکتور ذخیره می‌شود و با تأییدِ کارتخوان فاکتور صادر می‌شود.",
      };

  return { posPayment, posLocked };
}
