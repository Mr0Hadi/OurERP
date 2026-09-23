import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  normalizeListResponse,
  documentVersion,
} from "@/shared/services/api/contract";
import { toDateOnly } from "@/shared/lib/dateUtils";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";

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
 * به‌روزرسانیِ ۲۰۲۶-۰۹-۰۲ — دو شکافِ قبلی بسته شد:
 *  - **پیش‌فاکتور:** `PurchaseStatusEnum.PROFORMA = 0` حالا در بکند هم
 *    هست و شماره‌گذاریِ کلِ enum عیناً با فرانت یکی است (هیچ نگاشتی لازم
 *    نیست). در وضعیت پیش‌فاکتور، `invoiceNumber`/`invoiceDate` الزامی
 *    نیستند؛ ولی خروج از پیش‌فاکتور بدون شماره‌ی فاکتور با ۴۰۰ رد می‌شود.
 *  - **ضمیمه‌ی فاکتور:** `attachments` روی Create/Update پذیرفته و در
 *    `GetPurchaseDetail` برگردانده می‌شود. رفتارِ Update **جایگزینیِ
 *    کامل** است، پس همیشه فهرستِ نهایی فرستاده می‌شود.
 *
 * ویرایشِ اقلام: `UpdatePurchase` فهرستِ نهاییِ اقلام را در `productItemList`
 * می‌گیرد — `id` پر یعنی قلمِ موجود، خالی یعنی قلمِ تازه، و قلمی که در
 * فهرست نباشد حذف می‌شود. قلمی که از آن دریافت شده نه حذف می‌شود و نه
 * کمتر از «رسیده + بسته‌شده» (`itemEditErrors` همین را پیش از ارسال چک
 * می‌کند). قرارداد: `Backend-Net/docs/purchase-frontend-sync-requests.fa.md` بند ۲.
 *
 * چیزهایی که بکند عمداً ندارد و فرانت هم دیگر وانمود نمی‌کند دارد:
 *  - ثبتِ پرداختِ پله‌ای endpoint ندارد؛ پرداخت با همان `paymentDetails`ِ
 *    `UpdatePurchase` (جایگزینیِ کامل) ثبت می‌شود.
 *  - فیلترِ چندتامین‌کننده‌ای، `search` آزاد و مرتب‌سازی پشتیبانی
 *    نمی‌شوند؛ لیست همیشه جدیدترین‌ها را اول می‌دهد.
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
 * فرم → `paymentDetails`ِ سرور.
 *
 * فرم پرداخت را با چهار فیلدِ جدا نگه می‌دارد
 * (`paymentType`/`checkNumber`/`transferRef`/`mixedPayments`)؛ بکند یک
 * آرایه‌ی `{type, amount, checkNumber?, transferRef?}[]` می‌خواهد. چون
 * ردیف‌های ترکیبی هم با `PaymentTypeEnum` شمرده می‌شوند، اینجا فقط
 * شکل عوض می‌شود نه معنیِ اعداد. طبق اعتبارسنجیِ بکند برای هر
 * `paymentType` جز نقدی این آرایه الزامی است، پس «نسیه» هم یک ردیف
 * می‌گیرد.
 */
function toApiPaymentDetails({
  paymentType,
  paidAmount,
  paymentPaidAt,
  checkNumber,
  transferRef,
  mixedPayments,
}) {
  // `paidAt` در بکند غیرِ nullable است و نفرستادنش `0001-01-01` ذخیره
  // می‌کند. ردیفی که از سرور آمده تاریخِ خودش را نگه می‌دارد، چون
  // `UpdatePurchase` ردیف‌ها را کامل جایگزین می‌کند.
  const now = new Date().toISOString();

  if (paymentType === PaymentTypeEnum.MIXED) {
    return (mixedPayments || []).map((part) => ({
      type: part.type,
      amount: Number(part.amount) || 0,
      paidAt: part.paidAt || now,
      checkNumber: part.checkNumber || undefined,
      transferRef: part.transferRef || undefined,
    }));
  }

  const amount = Number(paidAmount) || 0;
  const paidAt = paymentPaidAt || now;

  if (paymentType === PaymentTypeEnum.CHECK) {
    return [{ type: paymentType, amount, paidAt, checkNumber: checkNumber || undefined }];
  }
  if (paymentType === PaymentTypeEnum.TRANSFER) {
    return [{ type: paymentType, amount, paidAt, transferRef: transferRef || undefined }];
  }
  if (paymentType === PaymentTypeEnum.CREDIT) {
    return [{ type: paymentType, amount, paidAt }];
  }
  return [];
}

/**
 * `paymentDetails`ِ سرور → فیلدهای فرم.
 *
 * برعکسِ تابعِ بالا. بدون این، سندی که با پرداختِ ترکیبی ثبت شده بود
 * هنگام باز شدن هیچ ردیفی نشان نمی‌داد (فرم دنبال `mixedPayments`
 * می‌گشت و سرور `paymentDetails` فرستاده بود)، و شماره‌ی چک/پیگیریِ
 * سندهای تک‌روشی هم خالی می‌ماند.
 */
function fromApiPaymentDetails(paymentDetails = [], paymentType) {
  const rows = paymentDetails.map((detail) => ({
    id: detail.id,
    type: detail.type,
    amount: Number(detail.amount) || 0,
    paidAt: detail.paidAt || null,
    checkNumber: detail.checkNumber || "",
    transferRef: detail.transferRef || "",
  }));

  if (paymentType === PaymentTypeEnum.MIXED) {
    return { mixedPayments: rows, checkNumber: "", transferRef: "", paymentPaidAt: null };
  }

  // روش‌های تک‌مرحله‌ای یک ردیف بیشتر ندارند؛ شماره‌ی چک/پیگیری از همان
  // ردیف به فیلدهای مسطحِ فرم برمی‌گردد.
  const single = rows.find((row) => row.checkNumber || row.transferRef) || rows[0];
  return {
    mixedPayments: [],
    checkNumber: single?.checkNumber || "",
    transferRef: single?.transferRef || "",
    paymentPaidAt: single?.paidAt || null,
  };
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
    // فیلدِ سرور `paymentDate` است؛ فرم داخلی همان مفهوم را `dueDate` صدا می‌زند.
    dueDate: toDateOnly(dto.paymentDate),
    items: dto.items || [],
    paymentDetails: dto.paymentDetails || [],
    ...fromApiPaymentDetails(dto.paymentDetails, dto.paymentType),
    drivers: dto.drivers || [],
    receivingNotes: dto.receivingNotes || [],
    attachments: dto.attachments || [],
  };

  // `GetPurchaseDetail` هنوز `updatedAt` نمی‌دهد؛ بدون کلیدِ نسخه، فرم
  // بعد از بازگشت به همان خرید روی داده‌ی کهنه می‌ماند.
  return { ...purchase, updatedAt: documentVersion(purchase) };
}

/**
 * `attachments` — بند ۳ سندِ `invoice-attachment-requirements.fa.md`:
 * `{objectKey, fileName?, note?}`. همان شکلی که `useInvoiceAttachments`
 * در `filesPayload` می‌دهد، پس معمولاً بدونِ تبدیل رد می‌شود.
 */
function toApiAttachments(attachments = []) {
  return attachments
    .filter((item) => item?.objectKey)
    .map((item) => ({
      objectKey: item.objectKey,
      fileName: item.fileName || undefined,
      note: item.note || undefined,
    }));
}

function toApiPurchasePayload(purchaseData) {
  return {
    supplierId: purchaseData.supplierId,
    invoiceNumber: purchaseData.invoiceNumber,
    invoiceDate: purchaseData.invoiceDate || null,
    paymentDate: purchaseData.dueDate || null,
    description: purchaseData.description || undefined,
    status: purchaseData.status,
    paymentType: purchaseData.paymentType,
    totalAmount: purchaseData.totalAmount,
    paidAmount: purchaseData.paidAmount,
    attachments: toApiAttachments(purchaseData.attachments),
  };
}

export async function fetchPurchases(params = {}) {
  const { data } = await axiosInstance.get("/Purchase/GetPurchaseList", {
    params: {
      page: params.page,
      take: params.limit,
      invoiceNumber: params.search || undefined,
      supplierId: params.supplierId || undefined,
      status: params.status !== "" ? params.status : undefined,
      paymentType:
        params.paymentType !== "" && params.paymentType != null
          ? params.paymentType
          : undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
    },
  });
  return normalizeListResponse(data, { itemsKey: "purchaseList" });
}

export async function fetchPurchaseById(id) {
  const { data } = await axiosInstance.get("/Purchase/GetPurchaseDetail", {
    params: { id },
  });
  return fromApiPurchase(data);
}

export async function createPurchase(purchaseData) {
  const { data } = await axiosInstance.post("/Purchase/CreatePurchase", {
    ...toApiPurchasePayload(purchaseData),
    paymentDetails: toApiPaymentDetails(purchaseData),
    productItemList: toApiItems(purchaseData.items),
  });
  return data;
}

/**
 * `productItemList` فهرستِ *نهاییِ* اقلام است (جایگزینیِ کامل، با `id`ِ
 * قلم‌های موجود) و `totalAmount` از همین اقلام حساب شده است.
 * `attachments` و `paymentDetails` اما هر دو
 * **جایگزینیِ کامل**اند: هرچه در آرایه نباشد از سرور پاک می‌شود، پس
 * همیشه فهرستِ نهایی فرستاده می‌شود. برای هر `paymentType` جز نقدی،
 * `paymentDetails` خالی با ۴۰۰ رد می‌شود.
 */
export async function updatePurchase(id, updates) {
  const { data } = await axiosInstance.put("/Purchase/UpdatePurchase", {
    id,
    ...toApiPurchasePayload(updates),
    paymentDetails: toApiPaymentDetails(updates),
    productItemList: toApiItems(updates.items),
  });
  return data;
}

/**
 * جایگزینِ واقعی برای PATCH وضعیت وجود ندارد؛ باید کل سند را با
 * `UpdatePurchase` فرستاد. و چون آن دستور همه‌ی فیلدها را بازنویسی
 * می‌کند (`attachments` را هم *جایگزین* می‌کند)، فرستادنِ یک
 * `{status}`ِ تنها یعنی پاک‌شدنِ شماره‌ی فاکتور و ضمیمه‌ها — پس سندِ
 * فعلی اول خوانده و بعد با وضعیتِ تازه پس فرستاده می‌شود.
 *
 * `UpdatePurchase` هیچ `data`یی برنمی‌گرداند؛ این تابع سندِ تازه را
 * دوباره می‌خواند تا فراخوان چیزی واقعی برای نشاندن در کش داشته باشد.
 */
export async function updatePurchaseStatus(id, status) {
  const current = await fetchPurchaseById(id);
  await updatePurchase(id, { ...current, status });
  return fetchPurchaseById(id);
}

/** `DeletePurchase` هیچ `data`یی برنمی‌گرداند؛ شناسه برای پاک‌کردنِ کش از خودِ ورودی برمی‌گردد. */
export async function removePurchase(id) {
  await axiosInstance.delete("/Purchase/DeletePurchase", {
    params: { id },
  });
  return { id };
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
 * مازاد/سفارش‌نداده وارد سفارش و موجودی می‌شوند و `totalAmount` خرید
 * بالا می‌رود. پرداختِ خودِ این مبلغ همچنان با `UpdatePurchase` ثبت می‌شود.
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
