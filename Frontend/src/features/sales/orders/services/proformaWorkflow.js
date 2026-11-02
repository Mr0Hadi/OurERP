import { createInstallmentPlan } from "@/features/sales/installments/services/api-v1";
import { SaleProformaEventEnum, SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { runDocumentChanges } from "@/shared/services/documentChanges";
import {
  SALE_DOCUMENT_CHANGES_API,
  approveSaleProforma,
  changeSaleStatus,
  checkSaleWarehouse,
  completeInPersonSale,
  createInPersonProforma,
  createSale,
  releaseSaleReservation,
  updateSale,
  updateSaleAttachments,
  updateSalePaymentDate,
} from "./api-v1";

/**
 * زنجیره‌های سمتِ سرورِ چرخه‌ی پیش‌فاکتور (بخش ۱۱ سند) — تابعِ خالص روی `api-v1`، بی React و بی کش.
 * mutationها (`mutations.js`) و کارتخوان (`useSalePosActions`) از همین‌ها می‌سازند؛ کش را آن‌ها به‌روز
 * می‌کنند (کارتخوان عمداً تا «بستن»ِ رسید نه، وگرنه پنلش وسطِ کار از صفحه می‌رفت).
 */

/** پیامِ کسریِ انبار از آخرین رویدادِ `WAREHOUSE_SHORTAGE`. */
function shortageNote(sale) {
  const event = [...(sale.proformaEvents || [])]
    .reverse()
    .find((e) => e.kind === SaleProformaEventEnum.WAREHOUSE_SHORTAGE);
  return event?.note || "همه‌ی دانه‌ها رزرو نشد";
}

/**
 * شیوه‌ی پرداختِ پیش‌فاکتورِ «آماده‌ی پرداخت» را لحظه‌ی دریافت ثبت می‌کند (نقد/نسیه ⇄ اقساطی). سرور
 * قرارداد را فقط روی فروشِ اقساطی و دریافتِ عادی را فقط روی غیراقساطی می‌پذیرد، و تغییرِ `paymentType`
 * در `UpdateSale` پیش‌فاکتور را به پیش‌نویس می‌برد؛ پس `UpdateSale` (فقط همین فیلد) ← `ApproveSaleProforma`،
 * که چون رزروها مانده‌اند مستقیم «آماده‌ی پرداخت» برمی‌گردد. اگر مهلتِ رزرو گذشته باشد خطا می‌دهد.
 * فقط برای جابه‌جاییِ نقد/نسیه ⇄ اقساطی لازم است؛ نقد ⇄ نسیه را سرور هنگامِ صدور با پرداختِ کامل از
 * ردیف‌ها می‌نشاند (۲۴.۴).
 *
 * @returns سندِ تازه (یا همان سند اگر شیوه عوض نشده)
 */
export async function ensureProformaPaymentType(sale, paymentType) {
  if (Number(sale.paymentType) === Number(paymentType)) return sale;
  const updated = await updateSale(sale.id, { ...sale, paymentType });
  const approved = await approveSaleProforma(sale.id, updated.revision);
  if (approved.proformaStage !== SaleProformaStageEnum.WAREHOUSE_CHECKED) {
    throw new Error("شیوه‌ی پرداخت ثبت شد ولی مهلتِ رزرو گذشته بود؛ پیش‌فاکتور برای بررسیِ دوباره به انبار رفت.");
  }
  return approved;
}

/**
 * تغییرهای بی‌اثر بر چرخه‌ی تأیید، پیش از دریافت: `update` (بدنه‌ی کاملِ `UpdateSale` با همان شرایطِ
 * ذخیره‌شده — مثلاً توضیحِ تازه) یا فقط `attachments`. هیچ‌کدام ⇒ کاری نمی‌کند.
 */
export async function saveProformaInfo(saleId, { update, attachments } = {}, version) {
  // قدمِ قبل (شیوه‌ی پرداخت) نسخه را عوض کرده باشد، همان نسخه‌ی تازه فرستاده می‌شود، نه نسخه‌ی فرم.
  if (update) await updateSale(saleId, version ? { ...update, updatedAt: version } : update);
  else if (attachments) await updateSaleAttachments(saleId, attachments);
}

/**
 * قرارداد اقساط با پیش‌پرداخت روی پیش‌فاکتورِ «آماده‌ی پرداخت» (فاکتور صادر می‌شود). فروشِ حضوری
 * (`deliver`) همان‌جا تحویل هم می‌شود (`CompleteInPersonSale`). ایدمپوتنت (کلید از محتوا).
 *
 * @param plan بدنه‌ی `CreateSaleInstallmentPlan` بی `saleId` (`toApiCreatePlan`)
 */
export function recordProformaPlan(saleId, plan, { deliver = false } = {}) {
  if (deliver) {
    const body = { saleId, installmentPlan: plan };
    return completeInPersonSale(body, { idempotencyKey: idempotencyKeyFor(body) });
  }
  const body = { saleId, ...plan };
  return createInstallmentPlan(body, { idempotencyKey: idempotencyKeyFor(body) });
}

/**
 * گامِ دریافتِ پیش‌فاکتور، از اول تا آخر: شیوه‌ی پرداخت ← تغییرهای بی‌اثر ← یکی از این‌ها:
 *  - `plan`: قرارداد (و تحویل اگر `deliver`)؛
 *  - `deliver` بی قرارداد: `CompleteInPersonSale` با ردیف‌های تازه (جمعشان دقیقاً جمعِ فاکتور)؛
 *  - وگرنه دریافت‌ها از مسیرِ «ثبت تغییرات» (اولینش فاکتور را صادر می‌کند).
 * سررسیدِ تازه (`paymentDate`، نه `undefined`) بعد از صدور روی فاکتور می‌نشیند.
 *
 * @returns پاسخِ قدمِ آخر (سندِ فروش، قرارداد، یا `{ id, invoiceNumber, status }`)
 */
export async function settleProforma(
  sale,
  { paymentType, info, plan = null, payments, deliver = false, paymentDate },
) {
  const latest = await ensureProformaPaymentType(sale, paymentType);
  await saveProformaInfo(sale.id, info, latest?.updatedAt);

  if (plan) {
    const result = await recordProformaPlan(sale.id, plan, { deliver });
    if (!deliver && paymentDate !== undefined) await updateSalePaymentDate(sale.id, paymentDate);
    return result;
  }
  if (deliver) {
    const body = { saleId: sale.id, paymentRows: payments.rows.filter((row) => row.pending === "add") };
    return completeInPersonSale(body, { idempotencyKey: idempotencyKeyFor(body) });
  }
  return runDocumentChanges(SALE_DOCUMENT_CHANGES_API, sale.id, { paymentDraft: payments, paymentDate });
}

/** خطایی که پس از ذخیره‌ی پیش‌فاکتور رخ داد: صفحه به همان پیش‌فاکتور می‌رود تا کار از آن‌جا ادامه یابد. */
function partiallySaved(error, saleId) {
  error.partiallySaved = true;
  error.saleId = saleId;
  return error;
}

/**
 * ثبتِ پیش‌فاکتورِ تازه پس از تأییدِ مشتری (پیش از آن فقط «لیست قیمت‌ها» چاپ می‌شود):
 *  - بی اسکن: `CreateSale` ← (با `send`) `ApproveSaleProforma` — به صفِ انبار.
 *  - فروشِ حضوری (`scannedBarcodes` ناخالی؛ کالا جلوی مشتری است): `CreateInPersonProforma`، اتمیک — ثبت، تأیید و
 *    رزروِ همان دانه‌ها بی صفِ انبار. دانه‌ها تا مهلتِ تنظیمات رزرو می‌مانند.
 * خطای پس از ثبت (فقط مسیرِ بی‌اسکن) `partiallySaved` و `saleId` دارد.
 *
 * @param send کاربر `SaleUpdate` دارد (تأییدِ مشتری با همان است)
 * @param scannedBarcodes `{ [productId]: string[] }`
 * @returns `{ id, stage }`
 */
export async function createProforma(payload, { send, scannedBarcodes = {} }) {
  if (Object.keys(scannedBarcodes).length > 0) {
    const body = {
      ...payload,
      items: payload.items.map((item) => ({ ...item, productUnitBarcodes: scannedBarcodes[item.productId] || [] })),
    };
    const sale = await createInPersonProforma(body, { idempotencyKey: idempotencyKeyFor(body) });
    return { id: sale.id, stage: sale.proformaStage };
  }
  // retry بدون کلید یعنی پیش‌فاکتورِ تکراری.
  const created = await createSale(payload, { idempotencyKey: idempotencyKeyFor(payload) });
  if (!send) return { id: created.id, stage: SaleProformaStageEnum.DRAFT };
  try {
    const approved = await approveSaleProforma(created.id, 0);
    return { id: created.id, stage: approved.proformaStage };
  } catch (error) {
    throw partiallySaved(error, created.id);
  }
}

/**
 * تأییدِ انبار با تغییرِ اختیاریِ اقلام، در یک `CheckSaleWarehouse` (اتمیک): تعدادهای کمتر در `adjustments` و
 * دلیل در `note` (رویدادِ «انبار تغییر داد»). ردیفِ تغییرکرده رزروش را از دست می‌دهد، پس همه‌اش از نو اسکن
 * می‌شود؛ بقیه فقط کسریِ رزرو. ردیفِ کالای بی‌ردیابیِ بی‌اسکن را سرور خودش رزرو می‌کند.
 *
 * @param quantities `{ [saleItemId]: number }` فقط ردیف‌های تغییرکرده
 * @param scans      `{ [saleItemId]: string[] }`
 * @returns سندِ کاملِ فروش (`WAREHOUSE_CHECKED`)
 */
export async function approveAtWarehouse(sale, { quantities = {}, scans, issues = [], reason = "" }) {
  const adjustments = Object.entries(quantities).map(([saleItemId, quantity]) => ({
    saleItemId: Number(saleItemId),
    quantity: Number(quantity),
  }));
  const lines = (sale.items || [])
    .map((item) => {
      const changed = quantities[item.id] != null;
      const quantity = Number(quantities[item.id] ?? item.quantity) || 0;
      const need = changed ? quantity : Math.max(0, quantity - (Number(item.reservedQuantity) || 0));
      return { saleItemId: item.id, productUnitBarcodes: (scans[item.id] || []).slice(0, need) };
    })
    .filter((line) => line.productUnitBarcodes.length > 0);

  const checked = await checkSaleWarehouse({
    saleId: sale.id,
    revision: sale.revision,
    lines,
    issues,
    adjustments,
    note: reason || null,
  });
  if (checked.proformaStage !== SaleProformaStageEnum.WAREHOUSE_CHECKED) {
    throw new Error(`تأیید انبار ثبت نشد: ${shortageNote(checked)}`);
  }
  return checked;
}

/** آزادکردنِ دستیِ دانه‌های رزروِ یک پیش‌فاکتور پیش از پایانِ مهلت (`ReleaseSaleReservation`). */
export function releaseReservation(sale) {
  return releaseSaleReservation({ saleId: sale.id, revision: sale.revision });
}

/**
 * صدورِ فاکتورِ نسیه بی دریافت روی پیش‌فاکتورِ «آماده‌ی پرداخت»ِ غیراقساطی: تغییرهای بی‌اثر ← شیوه‌ی پرداخت ←
 * `ChangeSaleStatus { PROCESSING }`. کلِ مبلغ بدهیِ مشتری می‌شود؛ تاریخِ فاکتور همان تاریخِ ذخیره‌شده روی
 * پیش‌فاکتور است (نه بعد از امروز)، وگرنه امروز. سررسیدِ تازه بعد از صدور.
 */
export async function issueOnCredit(sale, { paymentType, info, paymentDate }) {
  const latest = await ensureProformaPaymentType(sale, paymentType);
  await saveProformaInfo(sale.id, info, latest?.updatedAt);
  const issued = await changeSaleStatus(sale.id, SaleStatusEnum.PROCESSING);
  if (paymentDate !== undefined) return updateSalePaymentDate(sale.id, paymentDate);
  return issued;
}
