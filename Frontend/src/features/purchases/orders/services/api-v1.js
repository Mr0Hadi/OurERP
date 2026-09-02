import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";
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
    quantity: item.qty,
    unitPrice: item.unitPrice,
    discount: item.discount || 0,
  }));
}

/**
 * فرم فرانت پرداخت را با ۴ فیلدِ جدا نگه می‌دارد
 * (`paymentType`/`checkNumber`/`transferRef`/`mixedPayments`)؛ بکند
 * فقط یک آرایه‌ی `paymentDetails: {type, amount, checkNumber?,
 * transferRef?}[]` می‌شناسد — که شکلش تقریباً عین `mixedPayments`ِ
 * فرانت است. طبق سند بکند، برای هر `paymentType` غیر از نقدی
 * (`CASH=0`) این آرایه الزامی است؛ برای «نسیه» (`CREDIT=1`) این قاعده
 * توی سند تأیید نشده — همان‌جا `[]` می‌فرستیم و قبل از قطعی‌کردن این
 * تابع حتماً با یک تست واقعی چک شود.
 */
function toApiPaymentDetails({ paymentType, paidAmount, checkNumber, transferRef, mixedPayments }) {
  if (paymentType === PaymentTypeEnum.MIXED) {
    return (mixedPayments || []).map((p) => ({
      type: p.type,
      amount: p.amount,
      checkNumber: p.checkNumber || undefined,
      transferRef: p.transferRef || undefined,
    }));
  }
  if (paymentType === PaymentTypeEnum.CHECK) {
    return [{ type: paymentType, amount: paidAmount, checkNumber: checkNumber || undefined }];
  }
  if (paymentType === PaymentTypeEnum.TRANSFER) {
    return [{ type: paymentType, amount: paidAmount, transferRef: transferRef || undefined }];
  }
  return [];
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
    paymentDetails: toApiPaymentDetails(purchaseData),
    attachments: toApiAttachments(purchaseData.attachments),
  };
}

export async function fetchPurchases(params = {}) {
  const { data } = await axiosInstance.get("/Purchase/GetPurchaseList", {
    params: {
      page: params.page,
      take: params.limit,
      invoiceNumber: params.search || undefined,
      // بکند فقط یک SupplierId تکی می‌گیرد؛ اولین انتخاب از چندانتخابیِ فرانت فرستاده می‌شود.
      supplierId: params.supplierIds?.[0] ?? undefined,
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
  return data;
}

export async function createPurchase(purchaseData) {
  const { data } = await axiosInstance.post("/Purchase/CreatePurchase", {
    ...toApiPurchasePayload(purchaseData),
    productItemList: toApiItems(purchaseData.items),
  });
  return data;
}

/**
 * «اقلام» در بدنه نادیده گرفته می‌شود — `UpdatePurchase` فقط فیلدهای سطح
 * سند را می‌پذیرد. `attachments` اما جدی است و **جایگزین** می‌شود: هرچه
 * در آرایه نباشد از سرور پاک می‌شود، پس همیشه فهرستِ نهایی فرستاده شود.
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
