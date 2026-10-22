import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { SaleProformaEventEnum, SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";

/**
 * کارِ دکمه‌ی اصلیِ فرمِ فروش در چرخه‌ی تأییدِ پیش‌فاکتور (بخش ۱۱ سند). صفحه فقط همین یک دکمه را
 * دارد؛ `ProformaStageCard` فقط وضعیت را می‌گوید.
 *
 *  - `create`: فروشِ تازه پس از تأییدِ مشتری — ثبت و ارسال به انبار در یک قدم (پیش از تأیید فقط
 *    «لیست قیمت‌ها» چاپ می‌شود، `PriceListPrint`)
 *  - `reserveInPerson`: فروشِ تازه‌ی حضوری (دانه‌ها جلوی مشتری اسکن شده) — ثبت و رزروِ همان دانه‌ها
 *    بی صفِ انبار؛ پرداخت بعد، همان‌جا یا در صندوق
 *  - `save`: خودِ پیش‌فاکتور عوض شده (تغییرِ مشتری/اقلام/قیمت/سررسید تأییدها را برمی‌گرداند؛ شیوه‌ی پرداخت فقط هنگامِ دریافت)
 *  - `sendToWarehouse`: پیش‌نویسِ دست‌نخورده؛ مشتری تأیید کرد
 *  - `awaitWarehouse`: در صفِ انبار
 *  - `pay`: «آماده‌ی پرداخت» و رزرو زنده — دریافت/قرارداد فاکتور را صادر می‌کند
 *  - `expired`: مهلتِ رزرو تمام شده
 */
export const ProformaAction = Object.freeze({
  CREATE: "create",
  RESERVE_IN_PERSON: "reserveInPerson",
  SAVE: "save",
  SEND_TO_WAREHOUSE: "sendToWarehouse",
  AWAIT_WAREHOUSE: "awaitWarehouse",
  PAY: "pay",
  EXPIRED: "expired",
});

/**
 * @param changes `{ core, dueDate, info, attachments }` — تغییرهای ذخیره‌نشده (selectorهای `saleFormStore`).
 *   در «آماده‌ی پرداخت» فقط `core` مانعِ دریافت است: سررسید بعد از صدور، و توضیح/پیوست (بی‌اثر بر
 *   چرخه) همراهِ دریافت ذخیره می‌شوند.
 */
export function proformaAction({ isNew, isInPerson, stage, secondsLeft, changes }) {
  if (isNew) return isInPerson ? ProformaAction.RESERVE_IN_PERSON : ProformaAction.CREATE;
  const checked = stage === SaleProformaStageEnum.WAREHOUSE_CHECKED;
  if (checked && secondsLeft !== 0) {
    return changes.core ? ProformaAction.SAVE : ProformaAction.PAY;
  }
  if (changes.core || changes.dueDate || changes.info || changes.attachments) return ProformaAction.SAVE;
  if (stage === SaleProformaStageEnum.DRAFT) return ProformaAction.SEND_TO_WAREHOUSE;
  if (stage === SaleProformaStageEnum.CUSTOMER_APPROVED) return ProformaAction.AWAIT_WAREHOUSE;
  return ProformaAction.EXPIRED;
}

/**
 * `paymentType`ِ بدنه‌ی `CreateSale`/`UpdateSale`. روی پیش‌فاکتورِ ذخیره‌شده سرور تغییرِ آن را تغییرِ
 * شرایط می‌داند و تأییدها را برمی‌گرداند، پس از دریافت‌ها ساخته نمی‌شود: اقساطی یا همان مقدارِ
 * ذخیره‌شده؛ پیش‌فاکتورِ تازه «نسیه». نوعِ واقعیِ هر پرداخت روی ردیفِ خودش است.
 */
export function proformaPaymentType(isInstallment, sale) {
  if (isInstallment) return PaymentTypeEnum.INSTALLMENT;
  const stored = sale?.paymentType;
  return stored == null || stored === PaymentTypeEnum.INSTALLMENT ? PaymentTypeEnum.CREDIT : stored;
}

/**
 * یادداشتِ بررسیِ انبارِ فروشِ حضوری. دانه‌ها را خودِ فروشنده هنگامِ ثبت اسکن کرده و بررسیِ انبار با
 * همین یادداشت ثبت می‌شود؛ صفحه‌ها از روی آن می‌فهمند کالا جلوی مشتری است و با پرداختِ کامل همان‌جا
 * تحویل می‌شود (`CompleteInPersonSale`).
 *
 * TODO(بکند): `frontend-requests.fa.md` بخش ۲۴.۵ — پرچمِ «حضوری» روی خودِ فروش به‌جای یادداشت.
 */
export const IN_PERSON_CHECK_NOTE = "فروش حضوری: دانه‌ها هنگامِ ثبتِ پیش‌فاکتور جلوی مشتری اسکن شد.";

/**
 * یادداشتی که سرور روی «تأییدِ انبار»ِ خودکار می‌گذارد: تأییدِ دوباره‌ی مشتری وقتی همه‌ی اقلام هنوز
 * رزروند (مثلاً پس از ثبتِ شیوه‌ی پرداخت) مستقیم «آماده‌ی پرداخت» می‌شود. آن رویداد بررسیِ تازه نیست،
 * پس در تشخیصِ حضوری از رویش می‌گذریم (`ApproveSaleProformaCommand`).
 */
const AUTO_RECHECK_NOTE = "کالای همه‌ی اقلام از بررسی قبلی انبار رزرو مانده است.";

/** آخرین «تأییدِ انبار»ِ واقعیِ پیش‌فاکتورِ «آماده‌ی پرداخت» (جز تأییدِ خودکار)، یا `undefined`. */
function lastWarehouseCheck(sale) {
  if (Number(sale?.proformaStage) !== SaleProformaStageEnum.WAREHOUSE_CHECKED) return undefined;
  return [...(sale.proformaEvents || [])]
    .reverse()
    .find((event) => event.kind === SaleProformaEventEnum.WAREHOUSE_CHECKED && event.note !== AUTO_RECHECK_NOTE);
}

/** پیش‌فاکتورِ «آماده‌ی پرداخت»ی که دانه‌هایش در فروشِ حضوری اسکن و رزرو شده‌اند. */
export function isInPersonProforma(sale) {
  return lastWarehouseCheck(sale)?.note === IN_PERSON_CHECK_NOTE;
}

/**
 * دلیلی که انباردار هنگامِ تغییرِ اقلام نوشت (`{ note, userName }`)، یا `null` — یادداشت‌های ثابتِ فروشِ حضوری
 * و تأییدِ خودکار دلیلِ تغییر نیستند.
 */
export function warehouseChangeNote(sale) {
  const check = lastWarehouseCheck(sale);
  if (!check?.note || check.note === IN_PERSON_CHECK_NOTE) return null;
  return { note: check.note, userName: check.userName };
}
