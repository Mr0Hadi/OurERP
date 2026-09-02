import { create } from 'zustand';
import { RECEIVING_SOURCES } from '../domain/receivingVocabulary';

// این استور در localStorage ذخیره نمی‌شود؛ فرم دریافت داده‌ای موقتی
// و لحظه‌ای است و باید همیشه از روی آخرین داده‌ی تازه‌ی سرور بازسازی
// شود.
const EMPTY_RECEIVING = {
  purchaseId: '',
  returnId: '',
  supplierName: '',
  invoiceNumber: '',
  invoiceDate: '',
  status: '',
  items: [],
  // کالاهایی که اصلاً در سیستم ما تعریف نشده‌اند و به هیچ قلم سفارش
  // وصل نمی‌شوند؛ انباردار فقط شرح و تعداد را می‌نویسد و اتصال به یک
  // کالای واقعی تا لحظه‌ی تصمیمِ «نگهداری» به تعویق می‌افتد.
  unknownItems: [],
  receivingNote: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  transporterName: '',
  transporterPhone: '',
  vehiclePlate: '',
};

function toReturnLine(line) {
  return {
    lineId: `return:${line.effectId}`,
    source: RECEIVING_SOURCES.RETURN,
    returnId: line.returnId,
    returnNumber: line.returnNumber,
    effectId: line.effectId,
    productId: line.productId,
    productName: line.productName,
    productCode: line.productCode,
    expectedQty: line.remainingQty,
    receivedQty: line.remainingQty,
    issues: [],
    excessQty: 0,
    excessNote: '',
  };
}

export const useReceivingFormStore = create((set, get) => ({
  formData: { ...EMPTY_RECEIVING },
  // کلید نسخه شامل updatedAt خرید است، نه فقط id — چون وقتی همان
  // خرید دوباره برای دور دومِ دریافت باز می‌شود، id عوض نمی‌شود ولی
  // updatedAt چرا؛ بدون این، اگر یک اسنپ‌شات قدیمی زودتر از دیتای
  // تازه رندر شود، فرم با دیتای قدیمی می‌ماند.
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  setReceivingItems: (items) =>
    set((state) => ({
      formData: { ...state.formData, items },
    })),
  setUnknownItems: (unknownItems) =>
    set((state) => ({
      formData: { ...state.formData, unknownItems },
    })),
  initializeFromPurchase: (purchaseData) => {
    const { initializedForId } = get();
    const version = `${purchaseData.id}:${purchaseData.updatedAt}`;
    if (initializedForId === version) return;

    // خطوطِ سفارش
    const orderLines = (purchaseData.items || [])
      .map((item) => {
        // `receivableQty` شکلِ mock است؛ `stillOwedQuantity` همان
        // فیلد را در پاسخِ واقعیِ `GetPurchaseReceivingInfo` می‌دهد
        // (`PurchaseReceivingItemInfoDto`). اگر هیچ‌کدام نبود، خودمان
        // از `qty`/`orderedQuantity` منهای `receivedQty`/`receivedQuantity`
        // و `settledQty` حساب می‌کنیم.
        const remaining =
          item.receivableQty ?? item.stillOwedQuantity ??
          Math.max(
            0,
            (item.qty ?? item.orderedQuantity ?? 0) -
              (item.receivedQty ?? item.receivedQuantity ?? 0) -
              (item.settledQty || 0),
          );
        return {
          lineId: `order:${item.productId}`,
          source: RECEIVING_SOURCES.ORDER,
          // فقط در پاسخِ واقعی هست (mock شناسه‌ی ردیفِ خرید ندارد) —
          // هر جا موجود باشد همراهِ ردیف نگه داشته می‌شود تا هنگامِ
          // ارسال به `ReceivePurchase` در دسترس باشد (بخش ۷ سند).
          purchaseItemId: item.purchaseItemId ?? null,
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          expectedQty: remaining,
          receivedQty: remaining,
          issues: [],
          // مازادِ همین قلم: تعدادی که *بیشتر* از سفارش رسیده. عمداً
          // بیرون از receivedQty نگه داشته می‌شود تا معنای «چقدر از
          // سفارش تحویل شد» و تمام محاسباتی که به آن وابسته‌اند دست
          // نخورد.
          excessQty: 0,
          excessNote: '',
        };
      })
      .filter((item) => item.expectedQty > 0);

    // خطوطِ مرجوعی: کالایی که طرف حساب بابت یک مرجوعی به ما بدهکار
    // است و ممکن است با همین محموله بفرستد. شناسه‌شان اثر است نه
    // کالا، چون یک کالا می‌تواند هم در سفارش باشد هم در چند مرجوعی.
    const returnLines = (purchaseData.returnLines || []).map(toReturnLine);

    set({
      initializedForId: version,
      formData: {
        purchaseId: purchaseData.id,
        supplierName: purchaseData.supplierName || '',
        invoiceNumber: purchaseData.invoiceNumber || '',
        invoiceDate: purchaseData.invoiceDate || '',
        status: purchaseData.status ?? '',
        items: [...orderLines, ...returnLines],
        unknownItems: [],
        receivingNote: '',
        receivedDate: new Date().toISOString().slice(0, 10),
        transporterName: '',
        transporterPhone: '',
        vehiclePlate: '',
      },
    });
  },
  /**
   * تحویل‌گرفتن کالای برگشتی از مشتری.
   *
   * همان فرمِ دریافت خرید است، فقط خطِ سفارشی ندارد — مشتری چیزی به
   * ما نفروخته. با این کار، گزارش مشکل و ثبت کالای اضافه/ثبت‌نشده که
   * مسیر خرید داشت، اینجا هم رایگان به دست می‌آید: مشتری هم ممکن است
   * اشتباه بفرستد.
   */
  initializeFromSalesReturn: (salesReturn, returnLines) => {
    const { initializedForId } = get();
    const version = `return:${salesReturn.id}:${salesReturn.updatedAt}`;
    if (initializedForId === version) return;

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_RECEIVING,
        returnId: salesReturn.id,
        supplierName: salesReturn.customerName || '',
        invoiceNumber: salesReturn.returnNumber || '',
        invoiceDate: salesReturn.returnDate || '',
        status: salesReturn.status ?? '',
        items: (returnLines || []).map(toReturnLine),
        receivedDate: new Date().toISOString().slice(0, 10),
      },
    });
  },

  resetForm: () =>
    set({ formData: { ...EMPTY_RECEIVING }, initializedForId: null }),
}));
