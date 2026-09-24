import axiosInstance from "@/shared/services/api/axios";
import {
  normalizeListResponse,
  documentVersion,
} from "@/shared/services/api/contract";
import { toDateOnly } from "@/shared/lib/dateUtils";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { toApiSort } from "@/shared/services/api/sorting";

export {
  SaleStatusEnum as SALE_STATUSES,
  SALE_STATUS_LABELS,
  isSaleProforma,
} from "@/shared/domain/enums/saleStatus";

/**
 * کنترلر `api/Sale` (`Backend-Net/docs/api-guide.fa.md`، بخش ۱۱). بکند از
 * الگوی `api/{Controller}/{Action}` استفاده می‌کند، نه REST.
 *
 *  - **پیش‌فاکتور:** فروشِ تازه همیشه پیش‌فاکتور ثبت می‌شود. با اولین
 *    ریالِ پرداخت (`paidAmount > 0`) خودِ `CreateSale`/`UpdateSale` شماره‌ی
 *    فاکتور را می‌سازد، تاریخ می‌زند و وضعیت را `PROCESSING` می‌کند. فرانت
 *    شماره‌ی فاکتور نمی‌فرستد.
 *  - **اقلام:** `UpdateSale` اقلام را کامل جایگزین می‌کند؛ `id:0` یعنی
 *    ردیفِ تازه.
 *  - **ضمیمه و پرداخت:** هر دو روی Update **جایگزینیِ کامل**اند.
 *  - **لیست:** فیلترِ مشتری فقط `customerName`ِ متنی است (نه `customerId`)؛
 *    مرتب‌سازی با `sortBy`/`sortDirection` (`SaleListSortEnum`).
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
 * همان نگاشتِ سمتِ خرید — توضیح کاملش در `purchases/orders/services/api-v1.js`.
 * `paidAt` در `PaymentDetailDto` غیرِ nullable است و نفرستادنش `0001-01-01`
 * ذخیره می‌کند؛ ردیفی که از سرور آمده تاریخِ خودش را نگه می‌دارد.
 */
function toApiPaymentDetails({
  paymentType,
  paidAmount,
  paymentPaidAt,
  checkNumber,
  transferRef,
  mixedPayments,
}) {
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

/** قرینه‌ی تابعِ بالا: `paymentDetails`ِ سرور روی فیلدهای فرم پهن می‌شود. */
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

  const single = rows.find((row) => row.checkNumber || row.transferRef) || rows[0];
  return {
    mixedPayments: [],
    checkNumber: single?.checkNumber || "",
    transferRef: single?.transferRef || "",
    paymentPaidAt: single?.paidAt || null,
  };
}

/**
 * سرور → فرم، برای کلِ سندِ فروش. دوقلوی `fromApiPurchase`؛ تنها
 * تفاوتش این است که یادداشت‌های حمل اینجا `shippingNotes` نام دارند.
 *
 * `SaleItemDto` نامِ کالا را دارد ولی کد و واحد را نه؛ `ProductPicker`
 * آن دو را از فهرستِ کالاها جبران می‌کند.
 */
export function fromApiSale(dto) {
  if (!dto) return dto;

  const sale = {
    ...dto,
    invoiceDate: toDateOnly(dto.invoiceDate),
    // فیلدِ سرور `paymentDate` است؛ فرم داخلی همان مفهوم را `dueDate` صدا می‌زند.
    dueDate: toDateOnly(dto.paymentDate),
    items: dto.items || [],
    paymentDetails: dto.paymentDetails || [],
    ...fromApiPaymentDetails(dto.paymentDetails, dto.paymentType),
    drivers: dto.drivers || [],
    shippingNotes: dto.shippingNotes || [],
    attachments: dto.attachments || [],
  };

  return { ...sale, updatedAt: sale.updatedAt || documentVersion(sale) };
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
    invoiceDate: saleData.invoiceDate || null,
    paymentDate: saleData.dueDate || null,
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
      // بکند فیلترِ customerId ندارد، فقط جست‌وجوی متنیِ نام مشتری.
      // از وقتی کشویی مشتری تک‌انتخابی شد، نامِ انتخاب‌شده هم کنارِ
      // شناسه در فیلتر می‌نشیند و همان فرستاده می‌شود.
      customerName: params.customerName || undefined,
      status: params.status !== "" ? params.status : undefined,
      paymentType: params.paymentType !== "" ? params.paymentType : undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
      ...toApiSort(params.sorting, SALE_SORT_COLUMNS),
    },
  });
  return normalizeListResponse(data, { itemsKey: "saleList" });
}

export async function fetchSaleById(id) {
  const { data } = await axiosInstance.get("/Sale/GetSaleDetail", {
    params: { id },
  });
  return fromApiSale(data);
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
 * فروشِ حضوری در یک درخواستِ اتمی: بکند فروش را ثبت (با شماره و تاریخِ
 * فاکتورِ خودکار)، خروجِ کالا با بارکدِ دانه‌های اسکن‌شده را انجام و وضعیت
 * را مستقیم «تحویل کامل» می‌کند؛ اگر قدمی شکست بخورد هیچ‌چیز ثبت نمی‌شود.
 *
 * @param scannedBarcodes `{ [productId]: string[] }`
 * @returns `{ id, invoiceNumber, status }`
 */
export async function createInPersonSale(saleData, scannedBarcodes = {}) {
  const { data } = await axiosInstance.post("/Sale/CreateInPersonSale", {
    sale: {
      ...toApiSalePayload(saleData),
      productIds: toApiCreateItems(saleData.items),
    },
    scannedItems: Object.entries(scannedBarcodes).map(([productId, barcodes]) => ({
      productId: Number(productId),
      productUnitBarcodes: barcodes,
    })),
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
 * ضمیمه‌ها) را بازنویسی می‌کند، سندِ فعلی اول خوانده می‌شود.
 *
 * `UpdateSale` هیچ `data`یی برنمی‌گرداند؛ سندِ تازه دوباره خوانده می‌شود
 * تا فراخوان چیزی واقعی برای نشاندن در کش داشته باشد.
 */
export async function updateSaleStatus(id, status) {
  const current = await fetchSaleById(id);
  await updateSale(id, { ...current, status });
  return fetchSaleById(id);
}

/** `DeleteSale` هیچ `data`یی برنمی‌گرداند؛ شناسه برای پاک‌کردنِ کش از خودِ ورودی برمی‌گردد. */
export async function removeSale(id) {
  await axiosInstance.delete("/Sale/DeleteSale", {
    params: { id },
  });
  return { id };
}
