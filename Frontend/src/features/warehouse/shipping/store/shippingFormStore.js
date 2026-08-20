import { create } from 'zustand';

// این استور در localStorage ذخیره نمی‌شود؛ فرم ارسال داده‌ای موقتی
// و لحظه‌ای است و باید همیشه از روی آخرین داده‌ی تازه‌ی سرور بازسازی شود.
const EMPTY_SHIPPING = {
  saleId: '',
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

    const shippingItems = (saleData.items || [])
      .map((item) => {
        const remaining =
          item.shippableQty != null
            ? item.shippableQty
            : Math.max(0, item.qty - (item.shippedQty || 0));
        return {
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          expectedQty: remaining,
          shippedQty: remaining,
        };
      })
      .filter((item) => item.expectedQty > 0);

    set({
      initializedForId: version,
      formData: {
        saleId: saleData.id,
        customerName: saleData.customerName || '',
        invoiceNumber: saleData.invoiceNumber || '',
        invoiceDate: saleData.invoiceDate || '',
        status: saleData.status || '',
        items: shippingItems,
        shippingNote: '',
        shippedDate: new Date().toISOString().slice(0, 10),
        driverName: '',
        driverNationalId: '',
        vehiclePlate: '',
      },
    });
  },
  resetForm: () =>
    set({ formData: { ...EMPTY_SHIPPING }, initializedForId: null }),
}));
