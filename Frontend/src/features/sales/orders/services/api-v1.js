import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  normalizeListResponse,
  documentVersion,
  toApiAttachments,
} from "@/shared/services/api/contract";
import { toDateOnly } from "@/shared/lib/dateUtils";
import { toApiPaymentRows } from "@/shared/components/payments/usePaymentDraft";

export {
  SaleStatusEnum as SALE_STATUSES,
  SALE_STATUS_LABELS,
  isSaleProforma,
} from "@/shared/domain/enums/saleStatus";

/**
 * کنترلر `api/Sale` (`Backend-Net/docs/api-guide.fa.md`، بخش ۱۱). بکند از
 * الگوی `api/{Controller}/{Action}` استفاده می‌کند، نه REST.
 *
 * **قفل پیش‌فاکتور (۲۰۲۶-۰۹-۲۴):** فروش همیشه پیش‌فاکتور ثبت می‌شود و
 * **اولین ریال پرداخت** (`paymentDetails`ِ `CreateSale` یا
 * `AddSalePayment`) فاکتور را صادر می‌کند: شماره‌ی رسمی، تاریخ و وضعیتِ
 * «آماده‌سازی انبار». راهِ دستی‌ای نیست و `status` دیگر فرستاده نمی‌شود.
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
  };

  return { ...sale, updatedAt: sale.updatedAt || documentVersion(sale) };
}

/** بند ۳ سندِ `invoice-attachment-requirements.fa.md` — همان شکلِ `filesPayload`ِ هوکِ آپلود. */
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
 * فروش همیشه پیش‌فاکتور ثبت می‌شود؛ `paymentDetails` با مبلغِ بیشتر از
 * صفر همین‌جا فاکتور را صادر می‌کند.
 *
 * @returns `{ id, invoiceNumber, status }`
 */
export async function createSale(saleData, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/Sale/CreateSale",
    {
      ...toApiSalePayload(saleData),
      paymentDetails: toApiPaymentRows(saleData.paymentRows),
      // نامِ فیلد گمراه‌کننده است: با وجودِ اسمِ `productIds`، بکند لیستی
      // از اقلامِ کامل (محصول+تعداد+قیمت+تخفیف) می‌خواهد، نه فقط شناسه.
      productIds: toApiCreateItems(saleData.items),
    },
    idempotent(idempotencyKey),
  );
  return data;
}

/**
 * فروشِ حضوری در یک درخواستِ اتمی: بکند فروش را ثبت (با شماره و تاریخِ
 * فاکتورِ خودکار)، خروجِ کالا با بارکدِ دانه‌های اسکن‌شده را انجام و وضعیت
 * را مستقیم «تحویل کامل» می‌کند؛ اگر قدمی شکست بخورد هیچ‌چیز ثبت نمی‌شود.
 * retry بدون کلید یعنی کالا دوبار از انبار کم می‌شد.
 *
 * @param scannedBarcodes `{ [productId]: string[] }`
 * @returns `{ id, invoiceNumber, status }`
 */
export async function createInPersonSale(
  saleData,
  scannedBarcodes = {},
  { idempotencyKey } = {},
) {
  const { data } = await axiosInstance.post(
    "/Sale/CreateInPersonSale",
    {
      sale: {
        ...toApiSalePayload(saleData),
        paymentDetails: toApiPaymentRows(saleData.paymentRows),
        productIds: toApiCreateItems(saleData.items),
      },
      scannedItems: Object.entries(scannedBarcodes).map(
        ([productId, barcodes]) => ({
          productId: Number(productId),
          productUnitBarcodes: barcodes,
        }),
      ),
    },
    idempotent(idempotencyKey),
  );
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
