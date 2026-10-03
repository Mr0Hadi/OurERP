import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  normalizeListResponse,
  documentVersion,
  toApiAttachments,
} from "@/shared/services/api/contract";
import { toDateOnly } from "@/shared/lib/dateUtils";
import { toApiPaymentRows } from "@/shared/components/payments/usePaymentDraft";

/** `PurchaseListSortEnum`ِ بکند، بر اساسِ شناسه‌ی ستونِ جدول. */
export const PURCHASE_SORT_COLUMNS = {
  invoiceNumber: 1,
  supplierName: 2,
  invoiceDate: 3,
  paymentDate: 4,
  status: 5,
  paymentType: 6,
  totalAmount: 7,
  paidAmount: 8,
};

export {
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
  isPurchaseProforma,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
} from "./constants";

/**
 * نسخه‌ی هماهنگ‌شده با بکندِ واقعی — کنترلر `api/Purchase`
 * (`Backend-Net/docs/api-guide.fa.md`، بخش ۹). بکند از الگوی
 * `api/{Controller}/{Action}` استفاده می‌کند، نه REST.
 *
 * **قفل پیش‌فاکتور (۲۰۲۶-۰۹-۲۴):** خرید فقط تا وقتی `PROFORMA` است با
 * `UpdatePurchase` ویرایش می‌شود. بعد از ثبتِ فاکتور تامین‌کننده، فقط
 * چهار چیز باز می‌ماند و هر کدام endpoint خودش را دارد: پرداخت‌ها
 * (`Add/Edit/VoidPurchasePayment`)، وضعیت (`ChangePurchaseStatus`)،
 * پیوست‌ها (`UpdatePurchaseAttachments`) و مهلت پرداخت
 * (`UpdatePurchasePaymentDate`). همه‌ی این‌ها و Create/Update سندِ کامل
 * (شکلِ `GetPurchaseDetail`) را برمی‌گردانند.
 *
 * `totalAmount` و `paidAmount` دیگر فرستاده نمی‌شوند: سرور جمع را از
 * اقلام و مالیاتِ کالاها، و پرداخت‌شده را از ردیف‌های پرداخت حساب می‌کند.
 *
 * جست‌وجو فقط روی شماره‌ی فاکتور است (`invoiceNumber`)؛ تامین‌کننده
 * فیلترِ جدای خودش را دارد.
 *
 * مرتب‌سازی با `sortBy`/`sortDirection` (`PurchaseListSortEnum`).
 */

/** `PurchaseItemDto` واقعی فقط این چهار فیلد را می‌خواهد؛ نام/کد/واحد/جمعِ خط را خودِ بکند از `productId` پر می‌کند. */
function toApiItems(items = []) {
  return items.map((item) => ({
    // فقط روی ویرایش معنا دارد: قلمِ موجود را از قلمِ تازه جدا می‌کند.
    id: item.id ?? undefined,
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount || 0,
  }));
}

/**
 * سرور → فرم، برای کلِ سندِ خرید.
 *
 * از وقتی نام‌های فرانت با `PurchaseItemDto` یکی شد، اقلام هیچ ترجمه‌ای
 * لازم ندارند و این تابع فقط سه کارِ باقی‌مانده را می‌کند: بریدنِ بخشِ
 * ساعت از تاریخِ فاکتور، پهن‌کردنِ `paymentDetails` روی فیلدهای فرم، و
 * پرکردنِ آرایه‌های نیامده. راننده‌ها و یادداشت‌های تحویل هم‌شکل‌اند و
 * دست‌نخورده رد می‌شوند.
 */
export function fromApiPurchase(dto) {
  if (!dto) return dto;

  const purchase = {
    ...dto,
    invoiceDate: toDateOnly(dto.invoiceDate),
    paymentDate: toDateOnly(dto.paymentDate),
    items: dto.items || [],
    paymentDetails: dto.paymentDetails || [],
    drivers: dto.drivers || [],
    receivingNotes: dto.receivingNotes || [],
    attachments: dto.attachments || [],
  };

  // `GetPurchaseDetail` هنوز `updatedAt` نمی‌دهد؛ بدون کلیدِ نسخه، فرم
  // بعد از بازگشت به همان خرید روی داده‌ی کهنه می‌ماند.
  return { ...purchase, updatedAt: documentVersion(purchase) };
}

function toApiPurchasePayload(purchaseData) {
  return {
    supplierId: purchaseData.supplierId,
    invoiceNumber: purchaseData.invoiceNumber,
    invoiceDate: purchaseData.invoiceDate || null,
    paymentDate: purchaseData.paymentDate || null,
    description: purchaseData.description || undefined,
    status: purchaseData.status,
    paymentType: purchaseData.paymentType,
    attachments: toApiAttachments(purchaseData.attachments),
  };
}

/** `GET GetPurchaseList` — پارامترها از `listQuery` با همان نام‌های `GetPurchaseListQuery`. */
export async function fetchPurchases(params) {
  const { data } = await axiosInstance.get("/Purchase/GetPurchaseList", { params });
  return normalizeListResponse(data, { itemsKey: "purchaseList" });
}

export async function fetchPurchaseById(id) {
  const { data } = await axiosInstance.get("/Purchase/GetPurchaseDetail", {
    params: { id },
  });
  return fromApiPurchase(data);
}

/** `CreatePurchase` سندِ کامل را برمی‌گرداند (شکلِ `GetPurchaseDetail`). */
export async function createPurchase(purchaseData, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/Purchase/CreatePurchase",
    {
      ...toApiPurchasePayload(purchaseData),
      paymentDetails: toApiPaymentRows(purchaseData.paymentRows),
      productItemList: toApiItems(purchaseData.items),
    },
    idempotent(idempotencyKey),
  );
  return fromApiPurchase(data);
}

/**
 * فقط پیش‌فاکتور. `productItemList` فهرستِ *نهاییِ* اقلام است (جایگزینیِ
 * کامل، با `id`ِ قلم‌های موجود) و `attachments` هم جایگزینیِ کامل است.
 * `status` برابر `PENDING`/`SHIPPED` یعنی خروج از پیش‌فاکتور، که شماره و
 * تاریخِ فاکتورِ تامین‌کننده را لازم دارد. پرداخت‌ها اینجا نیستند.
 */
export async function updatePurchase(id, updates) {
  const { data } = await axiosInstance.put("/Purchase/UpdatePurchase", {
    id,
    ...toApiPurchasePayload(updates),
    productItemList: toApiItems(updates.items),
  });
  return fromApiPurchase(data);
}

/**
 * تغییرِ دستیِ وضعیت، قبل یا بعد از صدور: `PROFORMA → PENDING/SHIPPED`
 * (شماره و تاریخِ فاکتور باید از قبل ذخیره شده باشد)، `PENDING ⇄ SHIPPED`،
 * و `CANCELLED` تا وقتی چیزی دریافت نشده.
 */
export async function changePurchaseStatus(id, status) {
  const { data } = await axiosInstance.post("/Purchase/ChangePurchaseStatus", {
    id,
    status,
  });
  return fromApiPurchase(data);
}

/** پیوست‌ها در هر وضعیتی؛ جایگزینیِ کامل. */
export async function updatePurchaseAttachments(id, attachments) {
  const { data } = await axiosInstance.put(
    "/Purchase/UpdatePurchaseAttachments",
    {
      id,
      attachments: toApiAttachments(attachments),
    },
  );
  return fromApiPurchase(data);
}

/** مهلت پرداخت در هر وضعیتی؛ `null` یعنی بدون مهلت. */
export async function updatePurchasePaymentDate(id, paymentDate) {
  const { data } = await axiosInstance.put(
    "/Purchase/UpdatePurchasePaymentDate",
    {
      id,
      paymentDate: paymentDate || null,
    },
  );
  return fromApiPurchase(data);
}

// ─── پرداخت‌ها ──────────────────────────────────────────────────────────────

/**
 * `direction`: خالی یا `OUT` = ما پرداختیم؛ `IN` = تامین‌کننده پول
 * برگرداند. روی خریدِ لغوشده فقط `IN` پذیرفته می‌شود.
 */
export async function addPurchasePayment(
  { purchaseId, type, amount, paidAt, checkNumber, transferRef, direction },
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/Purchase/AddPurchasePayment",
    { purchaseId, type, amount, paidAt, checkNumber, transferRef, direction },
    idempotent(idempotencyKey),
  );
  return fromApiPurchase(data);
}

/** ردیفِ قبلی باطل و ردیفِ تازه با همان جهت ثبت می‌شود؛ `id`ِ ردیف عوض می‌شود. */
export async function editPurchasePayment(
  { paymentId, type, amount, paidAt, checkNumber, transferRef },
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/Purchase/EditPurchasePayment",
    { paymentId, type, amount, paidAt, checkNumber, transferRef },
    idempotent(idempotencyKey),
  );
  return fromApiPurchase(data);
}

export async function voidPurchasePayment(paymentId) {
  const { data } = await axiosInstance.post("/Purchase/VoidPurchasePayment", {
    paymentId,
  });
  return fromApiPurchase(data);
}

/** فقط پیش‌فاکتور؛ خروجی `{ id }`. خریدِ صادرشده لغو می‌شود، نه حذف. */
export async function removePurchase(id) {
  const { data } = await axiosInstance.delete("/Purchase/DeletePurchase", {
    params: { id },
  });
  return data ?? { id };
}

// ─── اقلامِ پس از ثبت ───────────────────────────────────────────────────────

/**
 * «تامین‌کننده بقیه را نمی‌فرستد» — مقدارِ هنوز‌بدهکارِ قلم دیگر انتظار
 * نمی‌رود و وضعیت خرید از نو حساب می‌شود. فقط وقتی مجاز است که چیزی از
 * خرید رسیده باشد؛ هیچ پولی خودکار برنمی‌گردد.
 *
 * پاسخ: `{purchaseId, purchaseStatus, purchaseItemId, receivedQuantity,
 * shortClosedQuantity, shortClosedAt, stillOwedQuantity}`.
 */
export async function closePurchaseItem(purchaseItemId) {
  const { data } = await axiosInstance.post("/Purchase/ClosePurchaseItem", {
    purchaseItemId,
  });
  return data;
}

/** برعکسِ `closePurchaseItem` — مقدارِ بسته‌شده دوباره بدهکار می‌شود. */
export async function reopenPurchaseItem(purchaseItemId) {
  const { data } = await axiosInstance.post("/Purchase/ReopenPurchaseItem", {
    purchaseItemId,
  });
  return data;
}

/**
 * «کالای اضافه را نگه می‌داریم و پولش را می‌دهیم» — دانه‌های قرنطینه‌ی
 * مازاد/سفارش‌نداده وارد موجودی می‌شوند و فاکتور یک **قلمِ ضمیمه‌ی تازه**
 * (`isSupplement`) می‌گیرد؛ قلمِ سفارشی دست نمی‌خورد. `purchaseItemId`
 * در خروجی شناسه‌ی همان قلمِ ضمیمه است. پرداختِ این مبلغ با
 * `AddPurchasePayment` ثبت می‌شود.
 *
 * هر ردیف دقیقاً یکی از این دو است:
 *  - مازادِ یک قلم: `{purchaseItemId, quantity}` — با قیمت و تخفیفِ همان
 *    قلم؛ فرستادنِ `unitPrice`/`discount` ۴۰۰ می‌گیرد.
 *  - کالای سفارش‌نداده: `{productId, quantity, unitPrice, discount?}` —
 *    قیمتِ فاکتورِ تامین‌کننده الزامی است.
 */
export async function acceptPurchaseExcess(
  { purchaseId, date, note, items },
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/Purchase/AcceptPurchaseExcess",
    {
      purchaseId,
      date: date || undefined,
      note: note || undefined,
      items: items.map((item) =>
        item.purchaseItemId != null
          ? { purchaseItemId: item.purchaseItemId, quantity: Number(item.quantity) || 0 }
          : {
              productId: item.productId,
              quantity: Number(item.quantity) || 0,
              unitPrice: Number(item.unitPrice) || 0,
              discount: Number(item.discount) || 0,
            },
      ),
    },
    idempotent(idempotencyKey),
  );
  return data;
}
