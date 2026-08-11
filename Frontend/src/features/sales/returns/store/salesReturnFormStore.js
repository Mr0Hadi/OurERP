import { create } from "zustand";

const EMPTY_RETURN = {
  saleId: "",
  saleInvoiceNumber: "",
  customerId: "",
  customerName: "",
  returnDate: new Date().toISOString().slice(0, 10),
  reason: "defective", // دلیل کلی سند (برای فیلتر/گزارش)؛ جدا از دلایل تفکیکی هر کالا
  description: "",
  items: [],
};

export const useSalesReturnFormStore = create((set, get) => ({
  formData: { ...EMPTY_RETURN },
  initializedForId: null,

  setFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  setItems: (items) => set((state) => ({ formData: { ...state.formData, items } })),

  initializeForSale: (sale) => {
    const version = `sale:${sale.saleId}:${sale.saleUpdatedAt}`;
    if (get().initializedForId === version) return;

    const items = sale.items.map((entry) => ({
      lineId: `${sale.saleId}-${entry.productId}`,
      productId: entry.productId,
      productCode: entry.productCode,
      productName: entry.productName,
      unit: entry.unit,
      unitPrice: entry.unitPrice,
      maxReturnableQty: entry.returnableQty,
      // هر کالا می‌تواند بین چند دلیل مختلف تقسیم شود؛ هر ردیف یک
      // بخش از تعداد را با دلیل و توضیح خودش مشخص می‌کند.
      claims: [],
    }));

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_RETURN,
        saleId: sale.saleId,
        saleInvoiceNumber: sale.invoiceNumber,
        customerId: sale.customerId,
        customerName: sale.customerName,
        items,
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_RETURN }, initializedForId: null }),
}));