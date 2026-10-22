import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  normalizeListResponse,
  documentVersion,
  toApiAttachments,
} from "@/shared/services/api/contract";
import { toDateOnly } from "@/shared/lib/dateUtils";
import { toApiPaymentRows } from "@/shared/domain/payments/paymentRows";

/**
 * کنترلر `api/Sale` (`Backend-Net/docs/api-guide.fa.md`، بخش ۱۱). بکند از
 * الگوی `api/{Controller}/{Action}` استفاده می‌کند، نه REST.
 *
 * **قفل پیش‌فاکتور (۲۰۲۶-۰۹-۲۴):** فروش همیشه پیش‌فاکتور ثبت می‌شود و
 * **اولین ریال پرداخت** (`AddSalePayment`) فاکتور را صادر می‌کند: شماره‌ی رسمی،
 * تاریخ و وضعیتِ «آماده‌سازی انبار». راهِ دستی‌ای نیست و `status` فرستاده نمی‌شود.
 *
 * **چرخه‌ی تأیید (۲۰۲۶-۱۰-۱۶):** پیش از هر پرداختی پیش‌فاکتور باید از «تأیید مشتری»
 * (`ApproveSaleProforma`) و «تأیید انبار» (`CheckSaleWarehouse`، دانه‌ها رزرو می‌شوند)
 * بگذرد (`proformaStage`). رزرو مهلت دارد (`reservationExpiresAt`/`reservationSecondsLeft`).
 * فقط پیش‌فاکتور با `UpdateSale` ویرایش می‌شود؛ بعد از صدور فقط
 * پرداخت‌ها، وضعیت (`ChangeSaleStatus`: تحویل/لغو)، پیوست‌ها و مهلت
 * پرداخت، هر کدام با endpoint خودش. خروج یک‌طرفه است: ابطالِ پرداخت
 * فروش را به پیش‌فاکتور برنمی‌گرداند.
 *
 * `totalAmount` و `paidAmount` فرستاده نمی‌شوند. بدهی مشتری همیشه
 * `payableAmount − paidAmount` است (در فروش اقساطی `payableAmount` سودِ
 * اقساط را هم دارد).
 */

/** `SaleListSortEnum`ِ بکند، بر اساسِ شناسه‌ی ستونِ جدول. */
export const SALE_SORT_COLUMNS = {
  invoiceNumber: 1,
  customerName: 2,
  invoiceDate: 3,
  paymentDate: 4,
  status: 5,
  paymentType: 6,
  totalAmount: 7,
  paidAmount: 8,
};

/**
 * شکلِ خطِ کالا در `CreateSaleItemDto` — بدون `id`، چون هنوز ردیفی وجود
 * ندارد. نام‌ها با سرور یکی است، فقط فیلدهای اضافیِ فرم (نام/کد کالا،
 * جمعِ خط) کنار گذاشته می‌شوند.
 */
function toApiCreateItems(items = []) {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
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

/**
 * سرور → فرم، برای کلِ سندِ فروش. دوقلوی `fromApiPurchase`؛ تنها
 * تفاوتش این است که یادداشت‌های حمل اینجا `shippingNotes` نام دارند.
 *
 * اقلام نام کالا و مبالغِ ذخیره‌شده (`grossAmount`…`totalAmount`، نرخ
 * مالیات) را دارند؛ کدِ کالا را `ProductPicker` از فهرستِ کالاها پر می‌کند.
 */
export function fromApiSale(dto) {
  if (!dto) return dto;

  const sale = {
    ...dto,
    invoiceDate: toDateOnly(dto.invoiceDate),
    paymentDate: toDateOnly(dto.paymentDate),
    items: dto.items || [],
    paymentDetails: dto.paymentDetails || [],
    drivers: dto.drivers || [],
    shippingNotes: dto.shippingNotes || [],
    attachments: dto.attachments || [],
    proformaEvents: dto.proformaEvents || [],
    warehouseIssues: dto.warehouseIssues || [],
  };

  // `SaleDto` فیلدِ `updatedAt` ندارد. نسخه باید با هر تغییرِ سرور عوض شود تا فرمِ پیش‌فاکتور از نو
  // پر شود: `revision` (ویرایش، از جمله تغییرِ انبار)، مرحله و تعدادِ اقلام هم در آن است.
  const version = [
    documentVersion(sale),
    sale.revision,
    sale.proformaStage,
    sale.items.map((item) => `${item.id}:${item.quantity}:${item.unitPrice}`).join(","),
  ].join("|");
  return { ...sale, updatedAt: sale.updatedAt || version };
}

/** بدنه‌ی مشترکِ Create/Update. شماره‌ی فاکتور را همیشه سرور می‌سازد. */
function toApiSalePayload(saleData) {
  return {
    customerId: saleData.customerId,
    invoiceDate: saleData.invoiceDate || null,
    paymentDate: saleData.paymentDate || null,
    description: saleData.description || undefined,
    paymentType: saleData.paymentType,
    attachments: toApiAttachments(saleData.attachments),
  };
}

/** `GET GetSaleList` — پارامترها از `listQuery` با همان نام‌های `GetSaleListQuery`. */
export async function fetchSales(params) {
  const { data } = await axiosInstance.get("/Sale/GetSaleList", { params });
  return normalizeListResponse(data, { itemsKey: "saleList" });
}

export async function fetchSaleById(id) {
  const { data } = await axiosInstance.get("/Sale/GetSaleDetail", {
    params: { id },
  });
  return fromApiSale(data);
}

/**
 * فروش همیشه پیش‌فاکتورِ `DRAFT` ثبت می‌شود و پول نمی‌گیرد (`paymentDetails` از ۲۰۲۶-۱۰-۱۶
 * حذف شد). تعدادِ هر کالا نباید از موجودیِ آزادش بیشتر باشد (۴۰۰).
 *
 * @returns `{ id, invoiceNumber, status }`
 */
export async function createSale(saleData, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/Sale/CreateSale",
    {
      ...toApiSalePayload(saleData),
      // نامِ فیلد گمراه‌کننده است: با وجودِ اسمِ `productIds`، بکند لیستی
      // از اقلامِ کامل (محصول+تعداد+قیمت+تخفیف) می‌خواهد، نه فقط شناسه.
      productIds: toApiCreateItems(saleData.items),
    },
    idempotent(idempotencyKey),
  );
  return data;
}

/**
 * «مشتری تأیید کرد»: `DRAFT` ⇒ `CUSTOMER_APPROVED` (صفِ انبار)، یا مستقیم
 * `WAREHOUSE_CHECKED` اگر همه‌ی ردیف‌ها هنوز رزرو مانده‌اند. `revision` همانی است که
 * صفحه نشان داده؛ ویرایشِ هم‌زمان ۴۰۰ می‌گیرد. خروجی سندِ کامل.
 */
export async function approveSaleProforma(saleId, revision) {
  const { data } = await axiosInstance.post("/Sale/ApproveSaleProforma", { saleId, revision });
  return fromApiSale(data);
}

/**
 * بررسیِ انبار (همه یا هیچ). `lines`: `[{ saleItemId, productUnitBarcodes }]` — هر ردیف دقیقاً
 * به‌اندازه‌ی کسریِ رزروش. `issues`: `[{ productUnitBarcode, reason, description }]` دانه‌ی
 * معیوب/مفقود (قرنطینه). همه کامل ⇒ `WAREHOUSE_CHECKED`؛ وگرنه کسری ⇒ `DRAFT` و هیچ رزروی.
 * خروجی سندِ کامل.
 */
export async function checkSaleWarehouse({ saleId, revision, lines = [], issues = [], note = null }) {
  const { data } = await axiosInstance.post("/Sale/CheckSaleWarehouse", {
    saleId,
    revision,
    lines,
    issues,
    note: note || null,
  });
  return fromApiSale(data);
}

/**
 * گامِ آخرِ فروشِ حضوری روی پیش‌فاکتورِ `WAREHOUSE_CHECKED`، اتمیک: پرداخت (یا قرارداد
 * اقساط با پیش‌پرداخت) که فاکتور را صادر می‌کند، ارسالِ همان دانه‌های رزروشده و `DELIVERED`.
 * فروشِ غیراقساطی: جمعِ `payments` دقیقاً برابرِ `totalAmount`.
 *
 * @returns `{ id, invoiceNumber, status }`
 */
export async function completeInPersonSale(
  { saleId, paymentRows = [], installmentPlan = null, shippingNote },
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/Sale/CompleteInPersonSale",
    {
      saleId,
      payments: installmentPlan ? [] : toApiPaymentRows(paymentRows),
      installmentPlan,
      shippingNote: shippingNote || undefined,
    },
    idempotent(idempotencyKey),
  );
  return data;
}

// ─── گزارش‌های انبار (صفِ حسابداری) ─────────────────────────────────────────

/** `SaleWarehouseIssueListSortEnum`ِ بکند، بر اساسِ شناسه‌ی ستونِ جدول. */
export const WAREHOUSE_ISSUE_SORT_COLUMNS = {
  reportedAt: 0,
  productName: 1,
  reasonTitle: 2,
  resolvedAt: 3,
};

/** `GET GetSaleWarehouseIssueList` — `isOpen`، `saleId`، `productId`، `reason`، بازه‌ی `reportedAt`. */
export async function fetchSaleWarehouseIssues(params) {
  const { data } = await axiosInstance.get("/Sale/GetSaleWarehouseIssueList", { params });
  return normalizeListResponse(data);
}

/** `{ id, resolution, note }` — اسقاط `note` الزامی دارد. خروجی همان ردیفِ گزارش. */
export async function resolveSaleWarehouseIssue({ id, resolution, note }) {
  const { data } = await axiosInstance.post("/Sale/ResolveSaleWarehouseIssue", {
    id,
    resolution,
    note: note || null,
  });
  return data;
}

/**
 * فقط پیش‌فاکتور. `items` و `attachments` هر دو **جایگزینیِ کامل**اند.
 * وضعیت و پرداخت اینجا نیستند: خروج از پیش‌فاکتور فقط با پرداخت.
 */
export async function updateSale(id, updates) {
  const { data } = await axiosInstance.put("/Sale/UpdateSale", {
    id,
    ...toApiSalePayload(updates),
    items: toApiUpdateItems(updates.items),
  });
  return fromApiSale(data);
}

/** فقط `DELIVERED` (از «ارسال شده») و `CANCELLED` (پیش از هر ارسالی). */
export async function changeSaleStatus(id, status) {
  const { data } = await axiosInstance.post("/Sale/ChangeSaleStatus", {
    id,
    status,
  });
  return fromApiSale(data);
}

/** پیوست‌ها در هر وضعیتی؛ جایگزینیِ کامل. */
export async function updateSaleAttachments(id, attachments) {
  const { data } = await axiosInstance.put("/Sale/UpdateSaleAttachments", {
    id,
    attachments: toApiAttachments(attachments),
  });
  return fromApiSale(data);
}

/** مهلت پرداخت در هر وضعیتی؛ `null` یعنی بدون مهلت. */
export async function updateSalePaymentDate(id, paymentDate) {
  const { data } = await axiosInstance.put("/Sale/UpdateSalePaymentDate", {
    id,
    paymentDate: paymentDate || null,
  });
  return fromApiSale(data);
}

// ─── پرداخت‌ها ──────────────────────────────────────────────────────────────

/**
 * `direction`: خالی یا `IN` = مشتری پرداخت؛ `OUT` = پول به مشتری برگشت.
 * اولین `IN` روی پیش‌فاکتور فاکتور را صادر می‌کند. فروش اقساطی تا وقتی
 * قراردادش لغو نشده از این مسیر پرداخت نمی‌گیرد.
 */
export async function addSalePayment(
  { saleId, type, amount, paidAt, checkNumber, transferRef, direction },
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/Sale/AddSalePayment",
    { saleId, type, amount, paidAt, checkNumber, transferRef, direction },
    idempotent(idempotencyKey),
  );
  return fromApiSale(data);
}

export async function editSalePayment(
  { paymentId, type, amount, paidAt, checkNumber, transferRef },
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/Sale/EditSalePayment",
    { paymentId, type, amount, paidAt, checkNumber, transferRef },
    idempotent(idempotencyKey),
  );
  return fromApiSale(data);
}

export async function voidSalePayment(paymentId) {
  const { data } = await axiosInstance.post("/Sale/VoidSalePayment", {
    paymentId,
  });
  return fromApiSale(data);
}

/** فقط پیش‌فاکتور؛ خروجی `{ id }`. فروشِ صادرشده لغو می‌شود، نه حذف. */
export async function removeSale(id) {
  const { data } = await axiosInstance.delete("/Sale/DeleteSale", {
    params: { id },
  });
  return data ?? { id };
}

/**
 * endpointهای «ثبت تغییرات»ِ یک فروش برای `runDocumentChanges` (`shared/services/documentChanges.js`):
 * سند، دریافت‌ها، سررسید، پیوست‌ها و وضعیت، هر کدام با endpointِ خودش.
 */
export const SALE_DOCUMENT_CHANGES_API = Object.freeze({
  idField: "saleId",
  update: updateSale,
  addPayment: addSalePayment,
  editPayment: editSalePayment,
  voidPayment: voidSalePayment,
  paymentDate: updateSalePaymentDate,
  attachments: updateSaleAttachments,
  status: changeSaleStatus,
});
