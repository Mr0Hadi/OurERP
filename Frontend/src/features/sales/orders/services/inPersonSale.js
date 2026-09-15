import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { dispatchShipment } from "@/features/warehouse/shipping/services/api-v1";
import { createSale, fetchSaleById, updateSaleStatus } from "./api-v1";

/**
 * فروشِ حضوری: مشتری همان‌جا پول می‌دهد و کالا را تحویل می‌گیرد.
 *
 * بکند برای این یک دستورِ یکجا ندارد، پس سه قدم پشتِ‌سرِ هم انجام می‌شود:
 *
 *   ۱. `CreateSale` — به‌صورت پیش‌فاکتور با پرداختِ کامل، تا خودِ سرور
 *      شماره‌ی فاکتور بسازد و وضعیت را «آماده‌سازی» کند.
 *   ۲. `DispatchShipment` — خروجِ کالا با بارکدِ دانه‌های اسکن‌شده.
 *   ۳. `UpdateSale` — وضعیت «تحویل کامل».
 *
 * ⚠️ `CreateSale` شناسه‌ی فروشِ تازه را برنمی‌گرداند؛ فروش با مقایسه‌ی
 * فهرستِ فروش‌های همین مشتری قبل و بعد از ثبت پیدا می‌شود. وقتی بکند
 * شناسه را برگرداند، این جست‌وجو حذف می‌شود.
 *
 * اگر قدمِ ۲ یا ۳ شکست بخورد، فروش ثبت شده است؛ خطا با `saleId` برمی‌گردد
 * تا کاربر ادامه را از صفحه‌ی فروش یا ارسالِ انبار انجام دهد.
 */
export class InPersonSaleError extends Error {
  constructor(message, saleId = null) {
    super(message);
    this.saleId = saleId;
  }
}

async function saleIdsOfCustomer(customerName) {
  const { data } = await axiosInstance.get("/Sale/GetSaleList", {
    params: { customerName: customerName || undefined, take: 200 },
  });
  return normalizeListResponse(data, { itemsKey: "saleList" }).items;
}

async function findCreatedSaleId(payload, knownIds) {
  const after = await saleIdsOfCustomer(payload.customerName);
  const candidates = after.filter(
    (sale) =>
      !knownIds.has(sale.id) &&
      (sale.totalAmount == null ||
        Number(sale.totalAmount) === Number(payload.totalAmount)),
  );
  if (candidates.length !== 1) return null;
  return candidates[0].id;
}

/**
 * @param payload همان بدنه‌ی `createSale` (با `status` پیش‌فاکتور و پرداختِ کامل).
 * @param scannedBarcodes `{ [productId]: string[] }` — دانه‌های اسکن‌شده.
 */
export async function createInPersonSale(payload, scannedBarcodes = {}) {
  const before = await saleIdsOfCustomer(payload.customerName);
  const knownIds = new Set(before.map((sale) => sale.id));

  await createSale({ ...payload, status: SaleStatusEnum.PROFORMA });

  const saleId = await findCreatedSaleId(payload, knownIds);
  if (saleId == null) {
    throw new InPersonSaleError(
      "فروش ثبت شد ولی پیدا نشد تا تحویلش ثبت شود؛ ارسال و تحویل را از فهرست فروش‌ها انجام دهید.",
    );
  }

  try {
    const sale = await fetchSaleById(saleId);
    const items = (sale.items || [])
      .map((item) => {
        const quantity = (Number(item.quantity) || 0) - (Number(item.shippedQuantity) || 0);
        const barcodes = scannedBarcodes[item.productId] || [];
        return {
          saleItemId: item.id,
          shippedQuantity: quantity,
          productUnitBarcodes: barcodes.length === quantity ? barcodes : null,
        };
      })
      .filter((item) => item.shippedQuantity > 0);

    await dispatchShipment({
      sale: {
        saleId,
        shippedDate: new Date().toISOString().slice(0, 10),
        shippingNote: "تحویل حضوری به مشتری",
        items,
      },
      saleReturnRounds: [],
      purchaseReturnRounds: [],
    });
  } catch (error) {
    throw new InPersonSaleError(
      `فروش ثبت شد ولی خروجِ کالا ثبت نشد: ${error?.message || "خطای ناشناخته"}`,
      saleId,
    );
  }

  try {
    await updateSaleStatus(saleId, SaleStatusEnum.DELIVERED);
  } catch (error) {
    throw new InPersonSaleError(
      `کالا تحویل شد ولی وضعیت «تحویل کامل» ثبت نشد: ${error?.message || "خطای ناشناخته"}`,
      saleId,
    );
  }

  return { id: saleId };
}
