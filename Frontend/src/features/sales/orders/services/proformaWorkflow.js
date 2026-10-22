import { createInstallmentPlan } from "@/features/sales/installments/services/api-v1";
import { SaleProformaEventEnum, SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { runDocumentChanges } from "@/shared/services/documentChanges";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { IN_PERSON_CHECK_NOTE } from "../domain/proformaFlow";
import {
  SALE_DOCUMENT_CHANGES_API,
  approveSaleProforma,
  checkSaleWarehouse,
  completeInPersonSale,
  createSale,
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
 * بارکدهای اسکن‌شده‌ی فرم (`{ [productId]: string[] }`) → `lines`ِ `CheckSaleWarehouse`، هر ردیف به‌اندازه‌ی
 * کسریِ رزروش. اگر یک کالا در چند ردیف آمده، دانه‌ها به ترتیب بینِ ردیف‌ها پخش می‌شوند.
 */
function warehouseLinesFrom(sale, scannedBarcodes) {
  const left = Object.fromEntries(
    Object.entries(scannedBarcodes).map(([productId, codes]) => [productId, [...codes]]),
  );
  return (sale.items || []).map((item) => {
    const need = (Number(item.quantity) || 0) - (Number(item.reservedQuantity) || 0);
    const pool = left[item.productId] || [];
    return { saleItemId: item.id, productUnitBarcodes: pool.splice(0, Math.max(need, 0)) };
  });
}

/**
 * شیوه‌ی پرداختِ پیش‌فاکتورِ «آماده‌ی پرداخت» را لحظه‌ی دریافت ثبت می‌کند (نقد/نسیه ⇄ اقساطی). سرور
 * قرارداد را فقط روی فروشِ اقساطی و دریافتِ عادی را فقط روی غیراقساطی می‌پذیرد، و تغییرِ `paymentType`
 * در `UpdateSale` پیش‌فاکتور را به پیش‌نویس می‌برد؛ پس `UpdateSale` (فقط همین فیلد) ← `ApproveSaleProforma`،
 * که چون رزروها مانده‌اند مستقیم «آماده‌ی پرداخت» برمی‌گردد. اگر مهلتِ رزرو گذشته باشد خطا می‌دهد.
 *
 * TODO(بکند): `frontend-requests.fa.md` بخش ۲۴.۴ — تغییرِ شیوه‌ی پرداخت نباید تأییدها را برگرداند.
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
export async function saveProformaInfo(saleId, { update, attachments } = {}) {
  if (update) await updateSale(saleId, update);
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
  await ensureProformaPaymentType(sale, paymentType);
  await saveProformaInfo(sale.id, info);

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
 *  - فروشِ حضوری (`scannedBarcodes` ناخالی؛ کالا جلوی مشتری است): همان دو قدم ← `CheckSaleWarehouse` با همان
 *    دانه‌ها و `IN_PERSON_CHECK_NOTE`، بی صفِ انبار. دانه‌ها تا مهلتِ تنظیمات رزرو می‌مانند.
 * خطای پس از ثبت `partiallySaved` و `saleId` دارد.
 *
 * @param send کاربر `SaleUpdate` دارد (تأییدِ مشتری با همان است)
 * @returns `{ id, stage }`
 */
export async function createProforma(payload, { send, scannedBarcodes = {} }) {
  // retry بدون کلید یعنی پیش‌فاکتورِ تکراری.
  const created = await createSale(payload, { idempotencyKey: idempotencyKeyFor(payload) });
  const inPerson = Object.keys(scannedBarcodes).length > 0;
  if (!send && !inPerson) return { id: created.id, stage: SaleProformaStageEnum.DRAFT };
  try {
    const approved = await approveSaleProforma(created.id, 0);
    if (!inPerson) return { id: created.id, stage: approved.proformaStage };
    const checked = await checkSaleWarehouse({
      saleId: created.id,
      revision: approved.revision,
      lines: warehouseLinesFrom(approved, scannedBarcodes),
      note: IN_PERSON_CHECK_NOTE,
    });
    if (checked.proformaStage !== SaleProformaStageEnum.WAREHOUSE_CHECKED) {
      throw new Error(`رزروِ دانه‌ها ثبت نشد: ${shortageNote(checked)}`);
    }
    return { id: created.id, stage: checked.proformaStage };
  } catch (error) {
    throw partiallySaved(error, created.id);
  }
}

/**
 * تأییدِ انبار، با تغییرِ اختیاریِ اقلام. بی‌تغییر: یک `CheckSaleWarehouse`. با تغییر (تعدادِ کمتر یا حذفِ
 * ردیف، با دلیل): `UpdateSale` (به پیش‌نویس) ← `ApproveSaleProforma` (نسخه‌ی تازه) ← `CheckSaleWarehouse` با
 * دلیل در `note`، که در تاریخچه‌ی پیش‌فاکتور می‌ماند. اگر تأییدِ دوباره مستقیم «آماده‌ی پرداخت» شود (ردیف‌های
 * مانده رزرو بودند)، بررسی لازم نیست و دلیل فقط در رویدادِ «ویرایش» می‌ماند.
 *
 * TODO(بکند): `frontend-requests.fa.md` بخش ۲۴ — تا `CheckSaleWarehouse` تغییرِ تعداد را بپذیرد، زنجیره
 * `SaleUpdate` هم می‌خواهد و اتمیک نیست.
 *
 * @param quantities `{ [saleItemId]: number }` فقط ردیف‌های تغییرکرده
 * @param scans      `{ [saleItemId]: string[] }`
 * @returns سندِ کاملِ فروش (`WAREHOUSE_CHECKED`)
 */
export async function approveAtWarehouse(sale, { quantities = {}, scans, issues = [], reason = "" }) {
  let base = sale;
  if (Object.keys(quantities).length > 0) {
    const items = (sale.items || [])
      .map((item) => ({ ...item, quantity: quantities[item.id] ?? item.quantity }))
      .filter((item) => Number(item.quantity) > 0);
    // همان شرایطِ ذخیره‌شده (مشتری، شیوه‌ی پرداخت، سررسید)؛ فقط تعدادها عوض می‌شوند.
    const updated = await updateSale(sale.id, { ...sale, items });
    try {
      base = await approveSaleProforma(sale.id, updated.revision);
    } catch (error) {
      throw new Error(
        `${getErrorMessage(error, "ثبتِ تأیید انجام نشد")} — اقلامِ پیش‌فاکتور تغییر کرد ولی پیش‌فاکتور به پیش‌نویس برگشت و از صفِ انبار بیرون رفت؛ فروش باید دوباره «ارسال به انبار» بزند.`,
        { cause: error },
      );
    }
  }

  if (base.proformaStage === SaleProformaStageEnum.CUSTOMER_APPROVED) {
    base = await checkSaleWarehouse({
      saleId: sale.id,
      revision: base.revision,
      lines: (base.items || [])
        .map((item) => {
          const need = Math.max(0, Number(item.quantity) - (Number(item.reservedQuantity) || 0));
          return { saleItemId: item.id, productUnitBarcodes: (scans[item.id] || []).slice(0, need) };
        })
        .filter((line) => line.productUnitBarcodes.length > 0),
      issues,
      note: reason || null,
    });
  } else if (issues.length > 0) {
    // تأییدِ دوباره مستقیم «آماده‌ی پرداخت» شد؛ بررسی‌ای نمانده که گزارش‌ها همراهش بروند.
    throw new Error(
      "پیش‌فاکتور تغییر کرد و تأیید شد، ولی گزارشِ دانه‌های معیوب/مفقود ثبت نشد؛ آن‌ها را از صفحه‌ی «دانه‌ها و برچسب‌ها» قرنطینه کنید.",
    );
  }

  if (base.proformaStage !== SaleProformaStageEnum.WAREHOUSE_CHECKED) {
    throw new Error(`تأیید انبار ثبت نشد: ${shortageNote(base)}`);
  }
  return base;
}

/**
 * آزادکردنِ دانه‌های رزروِ یک پیش‌فاکتور پیش از پایانِ مهلت. یک `UpdateSale` همه‌ی ردیف‌ها را حذف و عیناً
 * دوباره اضافه می‌کند — حذفِ ردیف رزروش را آزاد می‌کند — و پیش‌فاکتور با همان اقلام به پیش‌نویس برمی‌گردد.
 *
 * TODO(بکند): `frontend-requests.fa.md` بخش ۲۴.۶ — `ReleaseSaleReservation`.
 */
export function releaseReservation(sale) {
  return updateSale(sale.id, { ...sale, items: (sale.items || []).map((item) => ({ ...item, id: 0 })) });
}
