import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";

/**
 * کارِ دکمه‌ی اصلیِ فرمِ فروش در چرخه‌ی تأییدِ پیش‌فاکتور (بخش ۱۱ سند). صفحه فقط همین یک دکمه را
 * دارد؛ `ProformaStageCard` فقط وضعیت را می‌گوید.
 *
 *  - `create`: فروشِ تازه پس از تأییدِ مشتری — ثبت و ارسال به انبار در یک قدم (پیش‌نویسِ پیش از
 *    تأیید فقط چاپ می‌شود، «لیست قیمت‌ها»، `PriceListPrint`)
 *  - `save`: خودِ پیش‌فاکتور عوض شده (تغییرِ مشتری/اقلام/قیمت/شیوه‌ی پرداخت/سررسید تأییدها را برمی‌گرداند)
 *  - `sendToWarehouse`: پیش‌نویسِ دست‌نخورده؛ مشتری تأیید کرد
 *  - `awaitWarehouse`: در صفِ انبار
 *  - `pay`: «آماده‌ی پرداخت» و رزرو زنده — دریافت/قرارداد فاکتور را صادر می‌کند
 *  - `expired`: مهلتِ رزرو تمام شده
 */
export const ProformaAction = Object.freeze({
  CREATE: "create",
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
export function proformaAction({ isNew, stage, secondsLeft, changes }) {
  if (isNew) return ProformaAction.CREATE;
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
 * ذخیره‌شده؛ پیش‌فاکتورِ تازه «نسیه». نوعِ واقعیِ هر پرداخت روی ردیفِ خودش است. (فروشِ پیشخوان که
 * همین حالا پرداخت می‌شود نوعش را از دریافت‌هایش می‌گیرد — `CounterSalePage`.)
 */
export function proformaPaymentType(isInstallment, sale) {
  if (isInstallment) return PaymentTypeEnum.INSTALLMENT;
  const stored = sale?.paymentType;
  return stored == null || stored === PaymentTypeEnum.INSTALLMENT ? PaymentTypeEnum.CREDIT : stored;
}
