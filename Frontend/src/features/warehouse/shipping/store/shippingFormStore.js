import { create } from 'zustand';
import { SHIPPING_SOURCES } from '../domain/shippingVocabulary';

// این استور در localStorage ذخیره نمی‌شود؛ فرم ارسال داده‌ای موقتی
// و لحظه‌ای است و باید همیشه از روی آخرین داده‌ی تازه‌ی سرور بازسازی شود.
const EMPTY_SHIPPING = {
  saleId: '',
  returnId: '',
  customerName: '',
  invoiceNumber: '',
  invoiceDate: '',
  status: '',
  items: [],
  shippingNote: '',
  shippedDate: new Date().toISOString().slice(0, 10),
  driverName: '',
  driverNationalId: '',
  vehiclePlate: '',
};

function toReturnLine(line) {
  return {
    lineId: `return:${line.effectId}`,
    source: SHIPPING_SOURCES.RETURN,
    returnId: line.returnId,
    returnNumber: line.returnNumber,
    effectId: line.effectId,
    productId: line.productId,
    productName: line.productName,
    productCode: line.productCode,
    expectedQty: line.remainingQty,
    shippedQty: line.remainingQty,
  };
}

export const useShippingFormStore = create((set, get) => ({
  formData: { ...EMPTY_SHIPPING },
  // کلید نسخه شامل updatedAt فروش است، نه فقط id — چون وقتی همان
  // فروش برای دور دومِ ارسال دوباره باز می‌شود، id عوض نمی‌شود ولی
  // updatedAt چرا.
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  setShippingItems: (items) =>
    set((state) => ({
      formData: { ...state.formData, items },
    })),
  initializeFromSale: (saleData) => {
    const { initializedForId } = get();
    const version = `${saleData.id}:${saleData.updatedAt}`;
    if (initializedForId === version) return;

    const orderLines = (saleData.items || [])
      .map((item) => {
        const remaining =
          item.shippableQty != null
            ? item.shippableQty
            : Math.max(0, item.qty - (item.shippedQty || 0));
        return {
          lineId: `order:${item.productId}`,
          source: SHIPPING_SOURCES.ORDER,
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          expectedQty: remaining,
          shippedQty: remaining,
        };
      })
      .filter((item) => item.expectedQty > 0);

    // کالای جایگزینی که بابت مرجوعی‌های همین فروش به مشتری بدهکاریم و
    // می‌تواند با همین ماشین برود.
    const returnLines = (saleData.returnLines || []).map(toReturnLine);

    set({
      initializedForId: version,
      formData: {
        saleId: saleData.id,
        customerName: saleData.customerName || '',
        invoiceNumber: saleData.invoiceNumber || '',
        invoiceDate: saleData.invoiceDate || '',
        status: saleData.status ?? '',
        items: [...orderLines, ...returnLines],
        shippingNote: '',
        shippedDate: new Date().toISOString().slice(0, 10),
        driverName: '',
        driverNationalId: '',
        vehiclePlate: '',
      },
    });
  },
  /**
   * حواله‌ای که فقط کالای مرجوعی می‌برد و پشتش سندِ فروشی نیست —
   * عودت مازاد به تامین‌کننده. همان فرم، بدون خطِ سفارش.
   */
  initializeFromReturn: (returnDoc, returnLines, header = {}) => {
    const { initializedForId } = get();
    const version = `return:${returnDoc.id}:${returnDoc.updatedAt}`;
    if (initializedForId === version) return;

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_SHIPPING,
        returnId: returnDoc.id,
        customerName: header.partyName || '',
        invoiceNumber: returnDoc.returnNumber || '',
        invoiceDate: returnDoc.returnDate || '',
        status: returnDoc.status || '',
        items: (returnLines || []).map(toReturnLine),
        shippedDate: new Date().toISOString().slice(0, 10),
      },
    });
  },

  resetForm: () =>
    set({ formData: { ...EMPTY_SHIPPING }, initializedForId: null }),
}));
