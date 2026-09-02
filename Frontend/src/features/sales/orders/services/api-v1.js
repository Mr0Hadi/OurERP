// src\features\sales\services\api-v1.js

import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";

export {
  SaleStatusEnum as SALE_STATUSES,
  SALE_STATUS_LABELS,
  isSaleProforma,
} from "@/shared/domain/enums/saleStatus";

/**
 * نسخه‌ی هماهنگ‌شده با بکندِ واقعی — کنترلر `api/Sale`
 * (`Backend-Net/docs/api-guide.fa.md`، بخش ۱۱). بکند از الگوی
 * `api/{Controller}/{Action}` استفاده می‌کند، نه REST.
 *
 * ⚠️ همین حالا هیچ کامپوننتی از این فایل import نمی‌کند (خرید/فروش
 * هنوز مستقیم از `api-mockData` می‌خوانند). این فایل فقط برای روزی
 * است که مهاجرت به بکندِ واقعی شروع شود.
 *
 * به‌روزرسانیِ ۲۰۲۶-۰۹-۰۲ — دو شکافِ قبلی بسته شد:
 *  - **پیش‌فاکتور:** `SalesStatusEnum.PROFORMA = 0` در بکند هم هست و
 *    شش عضوِ اولِ enum عیناً با فرانت یکی است. در پیش‌فاکتور،
 *    `invoiceNumber`/`invoiceDate` الزامی نیستند. **خروج از پیش‌فاکتور
 *    دستی نیست:** اگر `paidAmount >= totalAmount` باشد، خودِ
 *    `CreateSale`/`UpdateSale` شماره‌ی فاکتور را می‌سازد، تاریخ می‌زند و
 *    وضعیت را `PROCESSING` می‌کند؛ و تلاش برای خروجِ دستی بدون تسویه‌ی
 *    کامل با ۴۰۰ رد می‌شود.
 *  - **ضمیمه‌ی فاکتور:** `attachments` روی Create/Update پذیرفته و در
 *    `GetSaleDetail` برگردانده می‌شود. رفتارِ Update **جایگزینیِ کامل**
 *    است، پس همیشه فهرستِ نهایی فرستاده می‌شود.
 *
 * ⚠️ چیزهایی که هنوز حل‌نشده مانده‌اند:
 *  - ثبتِ پرداختِ پله‌ای وجود ندارد؛ `paidAmount` فقط با ارسالِ کل سند
 *    از نو overwrite می‌شود.
 *  - فیلترِ چندمشتری‌ای وجود ندارد؛ لیست فقط یک `customerName`ِ متنی
 *    می‌گیرد، نه `customerId`.
 *  - وضعیتِ `RETURNED` (۶) را بکند واقعاً ست می‌کند (وقتی مرجوعی کامل
 *    تسویه شود) ولی فرانت برچسبی برایش ندارد؛ چنین فروشی بدون برچسب
 *    نمایش داده می‌شود.
 */

/**
 * شکلِ خطِ کالا در `CreateSaleItemDto` — بدون `id`، چون هنوز ردیفی وجود
 * ندارد. `qty` نامِ فرانت است و `quantity` نامِ سرور؛ هر دو پذیرفته
 * می‌شود تا سندی که همین الان از `GetSaleDetail` خوانده شده هم بتواند
 * بی‌تبدیل پس فرستاده شود (مسیرِ `updateSaleStatus`).
 */
function toApiCreateItems(items = []) {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.qty ?? item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount || 0,
  }));
}

/** برخلاف خرید، `UpdateSale` اقلام را کامل می‌پذیرد: `id:0` یعنی ردیفِ تازه. */
function toApiUpdateItems(items = []) {
  return items.map((item) => ({
    id: item.id || 0,
    ...toApiCreateItems([item])[0],
  }));
}

/** همان نگاشتِ سمتِ خرید — نگاه کنید به توضیحِ کاملش در `purchases/orders/services/api-v1.js`. */
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

/** بند ۳ سندِ `invoice-attachment-requirements.fa.md` — همان شکلِ `filesPayload`ِ هوکِ آپلود. */
function toApiAttachments(attachments = []) {
  return attachments
    .filter((item) => item?.objectKey)
    .map((item) => ({
      objectKey: item.objectKey,
      fileName: item.fileName || undefined,
      note: item.note || undefined,
    }));
}

function toApiSalePayload(saleData) {
  return {
    customerId: saleData.customerId,
    invoiceNumber: saleData.invoiceNumber,
    invoiceDate: saleData.invoiceDate,
    description: saleData.description || undefined,
    status: saleData.status,
    paymentType: saleData.paymentType,
    totalAmount: saleData.totalAmount,
    paidAmount: saleData.paidAmount,
    paymentDetails: toApiPaymentDetails(saleData),
    attachments: toApiAttachments(saleData.attachments),
  };
}

export async function fetchSales(params = {}) {
  const { data } = await axiosInstance.get("/Sale/GetSaleList", {
    params: {
      page: params.page,
      take: params.limit,
      invoiceNumber: params.search || undefined,
      // بکند فیلترِ customerId ندارد، فقط جست‌وجوی متنیِ نام مشتری —
      // چیزی که فیلترِ چندانتخابیِ فرانت (customerIds) اصلاً تولید نمی‌کند.
      status: params.status !== "" ? params.status : undefined,
      paymentType: params.paymentType !== "" ? params.paymentType : undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      // sortBy/sortOrder روی این لیست پشتیبانی نمی‌شوند.
    },
  });
  return normalizeListResponse(data, { itemsKey: "saleList" });
}

export async function fetchSaleById(id) {
  const { data } = await axiosInstance.get("/Sale/GetSaleDetail", {
    params: { id },
  });
  return data;
}

export async function createSale(saleData) {
  const { data } = await axiosInstance.post("/Sale/CreateSale", {
    ...toApiSalePayload(saleData),
    // نامِ فیلد گمراه‌کننده است: با وجودِ اسمِ `productIds`، بکند لیستی
    // از اقلامِ کامل (محصول+تعداد+قیمت+تخفیف) می‌خواهد، نه فقط شناسه.
    productIds: toApiCreateItems(saleData.items),
  });
  return data;
}

/**
 * `attachments` **جایگزین** می‌شود، نه اضافه: هرچه در آرایه نباشد از
 * سرور پاک می‌شود — پس همیشه فهرستِ نهایی فرستاده شود.
 */
export async function updateSale(id, updates) {
  const { data } = await axiosInstance.put("/Sale/UpdateSale", {
    id,
    ...toApiSalePayload(updates),
    items: toApiUpdateItems(updates.items),
  });
  return data;
}

/**
 * جایگزینِ واقعی برای PATCH وضعیت وجود ندارد؛ باید کل سند را با
 * `UpdateSale` فرستاد — و چون آن دستور همه‌چیز (از جمله اقلام و
 * ضمیمه‌ها) را بازنویسی می‌کند، فرستادنِ یک `{status}`ِ تنها سند را
 * خالی می‌کند. پس سندِ فعلی اول خوانده می‌شود.
 *
 * امضا عمداً همان امضای `api-mockData` مانده تا مهاجرت فقط عوض‌کردنِ
 * import باشد؛ هزینه‌اش یک رفت‌وبرگشتِ اضافه است.
 */
export async function updateSaleStatus(id, status) {
  const current = await fetchSaleById(id);
  return updateSale(id, { ...current, status });
}

/**
 * ⚠️ هیچ endpointِ ثبتِ‌پرداختِ پله‌ای روی بکند نیست (گزارشِ شکاف،
 * بخش ۶). این تابع فعلاً امضایش را نگه می‌دارد ولی جایی برای صدازدن
 * ندارد؛ وقتی بکند این قابلیت را اضافه کرد، پیاده‌سازی واقعی همین‌جا
 * می‌آید.
 */
export async function updateSalePayment() {
  throw new Error(
    "بکند فعلاً endpointِ ثبتِ پرداختِ پله‌ای ندارد — به گزارشِ شکافِ خرید/فروش مراجعه کنید.",
  );
}

export async function removeSale(id) {
  const { data } = await axiosInstance.delete("/Sale/DeleteSale", {
    params: { id },
  });
  return data;
}
