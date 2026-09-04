import axiosInstance from "@/shared/services/api/axios";
import {
  normalizeListResponse,
  documentVersion,
} from "@/shared/services/api/contract";
import { toDateOnly } from "@/shared/utils/dateUtils";
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
 * ⚠️ همین حالا هیچ کامپوننتی از این فایل import نمی‌کند (خرید/فروش
 * هنوز مستقیم از `api-mockData` می‌خوانند). این فایل فقط برای روزی
 * است که مهاجرت به بکندِ واقعی شروع شود.
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
 * ⚠️ چیزهایی که هنوز حل‌نشده مانده‌اند:
 *  - ویرایشِ اقلامِ خرید ممکن نیست؛ `UpdatePurchase` فقط فیلدهای سطح
 *    سند را می‌گیرد.
 *  - ثبتِ پرداختِ پله‌ای وجود ندارد؛ `paidAmount` فقط با ارسالِ کل سند
 *    از نو overwrite می‌شود — به همین دلیل `updatePurchasePayment`
 *    اینجا هنوز به یک endpoint واقعی وصل نیست.
 *  - فیلترِ چندتامین‌کننده‌ای، `search` آزاد، و `sortBy`/`sortOrder`
 *    پشتیبانی نمی‌شوند؛ لیست فقط `SupplierId` تکی و `InvoiceNumber`
 *    می‌گیرد.
 */

/** `PurchaseItemDto` واقعی فقط این چهار فیلد را می‌خواهد؛ نام/کد/واحد/جمعِ خط را خودِ بکند از `productId` پر می‌کند. */
function toApiItems(items = []) {
  return items.map((item) => ({
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
  checkNumber,
  transferRef,
  mixedPayments,
}) {
  if (paymentType === PaymentTypeEnum.MIXED) {
    return (mixedPayments || []).map((part) => ({
      type: part.type,
      amount: Number(part.amount) || 0,
      checkNumber: part.checkNumber || undefined,
      transferRef: part.transferRef || undefined,
    }));
  }

  const amount = Number(paidAmount) || 0;

  if (paymentType === PaymentTypeEnum.CHECK) {
    return [{ type: paymentType, amount, checkNumber: checkNumber || undefined }];
  }
  if (paymentType === PaymentTypeEnum.TRANSFER) {
    return [{ type: paymentType, amount, transferRef: transferRef || undefined }];
  }
  if (paymentType === PaymentTypeEnum.CREDIT) {
    return [{ type: paymentType, amount }];
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
    checkNumber: detail.checkNumber || "",
    transferRef: detail.transferRef || "",
  }));

  if (paymentType === PaymentTypeEnum.MIXED) {
    return { mixedPayments: rows, checkNumber: "", transferRef: "" };
  }

  // روش‌های تک‌مرحله‌ای یک ردیف بیشتر ندارند؛ شماره‌ی چک/پیگیری از همان
  // ردیف به فیلدهای مسطحِ فرم برمی‌گردد.
  const single = rows.find((row) => row.checkNumber || row.transferRef) || rows[0];
  return {
    mixedPayments: [],
    checkNumber: single?.checkNumber || "",
    transferRef: single?.transferRef || "",
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
    dueDate: toDateOnly(dto.dueDate),
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
    invoiceDate: purchaseData.invoiceDate,
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
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      // paymentType, sortBy, sortOrder روی این لیست پشتیبانی نمی‌شوند.
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
 * «اقلام» در بدنه نادیده گرفته می‌شود — `UpdatePurchase` فقط فیلدهای سطح
 * سند را می‌پذیرد. `attachments` اما جدی است و **جایگزین** می‌شود: هرچه
 * در آرایه نباشد از سرور پاک می‌شود، پس همیشه فهرستِ نهایی فرستاده شود.
 *
 * `paymentDetails` عمداً فرستاده نمی‌شود: برخلافِ `CreatePurchaseCommand`،
 * `UpdatePurchaseCommand` اصلاً چنین فیلدی ندارد — فرستادنش فقط بی‌صدا
 * نادیده گرفته می‌شد (extra JSON property). یعنی جزئیاتِ پرداخت
 * (`checkNumber`/`transferRef`) بعد از ثبتِ اولیه از راهِ این endpoint
 * قابلِ ویرایش نیستند؛ فقط خودِ `paidAmount` است.
 */
export async function updatePurchase(id, updates) {
  const { data } = await axiosInstance.put("/Purchase/UpdatePurchase", {
    id,
    ...toApiPurchasePayload(updates),
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
 * امضا عمداً همان امضای `api-mockData` مانده تا مهاجرت فقط عوض‌کردنِ
 * import باشد؛ هزینه‌اش یک رفت‌وبرگشتِ اضافه است.
 */
export async function updatePurchaseStatus(id, status) {
  const current = await fetchPurchaseById(id);
  return updatePurchase(id, { ...current, status });
}

/**
 * ⚠️ هیچ endpointِ ثبتِ‌پرداختِ پله‌ای روی بکند نیست (گزارشِ شکاف،
 * بخش ۶). این تابع فعلاً امضایش را نگه می‌دارد ولی جایی برای صدازدن
 * ندارد؛ وقتی بکند این قابلیت را اضافه کرد، پیاده‌سازی واقعی همین‌جا
 * می‌آید.
 */
export async function updatePurchasePayment() {
  throw new Error(
    "بکند فعلاً endpointِ ثبتِ پرداختِ پله‌ای ندارد — به گزارشِ شکافِ خرید/فروش مراجعه کنید.",
  );
}

export async function removePurchase(id) {
  const { data } = await axiosInstance.delete("/Purchase/DeletePurchase", {
    params: { id },
  });
  return data;
}
