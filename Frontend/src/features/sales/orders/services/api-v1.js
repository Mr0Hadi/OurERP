import axiosInstance from "@/shared/services/api/axios";
import {
  idempotent,
  normalizeListResponse,
  documentVersion,
} from "@/shared/services/api/contract";
import { toDateOnly } from "@/shared/lib/dateUtils";
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
 *
 * ⚠️ فیلترِ لیست `customerId` نمی‌گیرد، فقط `customerName`ِ متنی — پس
 * انتخابِ کاربر به نام ترجمه و فرستاده می‌شود.
 */

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
 * فقط در `CreateSale`/`CreateInPersonSale`؛ ردیفِ بی‌مبلغ فرستاده نمی‌شود.
 */
function toApiPaymentDetails({
  paymentType,
  paidAmount,
  checkNumber,
  transferRef,
  mixedPayments,
}) {
  const rows =
    paymentType === PaymentTypeEnum.MIXED
      ? (mixedPayments || []).map((part) => ({
          type: part.type,
          amount: Number(part.amount) || 0,
          checkNumber: part.checkNumber || undefined,
          transferRef: part.transferRef || undefined,
        }))
      : [
          {
            type: paymentType,
            amount: Number(paidAmount) || 0,
            checkNumber:
              paymentType === PaymentTypeEnum.CHECK
                ? checkNumber || undefined
                : undefined,
            transferRef:
              paymentType === PaymentTypeEnum.TRANSFER
                ? transferRef || undefined
                : undefined,
          },
        ];
  return rows.filter((row) => row.amount > 0);
}

/** قرینه‌ی تابعِ بالا: `paymentDetails`ِ سرور روی فیلدهای فرم پهن می‌شود. */
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

  const single = rows.find((row) => row.checkNumber || row.transferRef) || rows[0];
  return {
    mixedPayments: [],
    checkNumber: single?.checkNumber || "",
    transferRef: single?.transferRef || "",
  };
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

/** بدنه‌ی مشترکِ Create/Update. شماره‌ی فاکتور را همیشه سرور می‌سازد. */
function toApiSalePayload(saleData) {
  return {
    customerId: saleData.customerId,
    invoiceDate: saleData.invoiceDate || null,
    paymentDate: saleData.dueDate || null,
    description: saleData.description || undefined,
    paymentType: saleData.paymentType,
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
      // sortBy/sortOrder روی این لیست پشتیبانی نمی‌شوند.
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
      paymentDetails: toApiPaymentDetails(saleData),
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
        paymentDetails: toApiPaymentDetails(saleData),
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
