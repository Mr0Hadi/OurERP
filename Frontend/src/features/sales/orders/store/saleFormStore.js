import { create } from "zustand";
import { EMPTY_SETTLEMENT } from "@/shared/domain/payments/settlement";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";

const EMPTY_FORM = {
  customerId: "",
  customerName: "",
  invoiceNumber: "",
  invoiceDate: "",
  paymentDate: "",
  description: "",
  status: "",
  items: [],
  // روش و مبلغ‌های پرداختِ همراهِ ثبت (`settlement.js`) — در store تا رفتن به
  // «کالای جدید» پاکش نکند.
  settlement: EMPTY_SETTLEMENT,
  // قیمتِ پیش‌فرضِ اقلامِ تازه: فروشِ خرده (`retailPrice`) یا همکار/عمده
  // (`wholeSalePrice`). فقط فرم است؛ به سرور نمی‌رود.
  priceMode: "retail",
};

export const useSaleFormStore = create((set, get) => ({
  formData: { ...EMPTY_FORM },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),

  /** مثلِ `setState`: مقدار یا تابعِ به‌روزرسان. */
  setSettlement: (next) =>
    set((state) => ({
      formData: {
        ...state.formData,
        settlement: typeof next === "function" ? next(state.formData.settlement) : next,
      },
    })),

  setItems: (items) =>
    set((state) => ({
      formData: { ...state.formData, items },
    })),

  initializeForNew: () => {
    const { initializedForId } = get();
    if (initializedForId === "new") return;

    set({ initializedForId: "new" });
  },

  initializeFromSale: (sale) => {
    const { initializedForId } = get();
    const version = `${sale.id}:${sale.updatedAt}`;
    if (initializedForId === version) return;

    // `id` نگه داشته می‌شود چون `UpdateSale` ردیف‌ها را با همان تشخیص
    // می‌دهد (`id: 0` یعنی ردیف تازه)؛ بدون آن هر ذخیره، اقلامِ سند را
    // پاک و از نو می‌ساخت.
    const formattedItems = (sale.items || []).map((item) => ({
      id: item.id,
      productId: item.productId || "",
      productCode: item.productCode || "",
      productName: item.productName || "",
      unit: unitLabelOf(item.unit),
      quantity: Number(item.quantity ?? item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      discount: item.discount || 0,
      // نرخ مالیاتی که سرور برای این قلم نگه داشته — پیش‌نمایشِ جمع با آن حساب می‌شود.
      taxPercent: item.taxPercent,
      taxCategory: item.taxCategory,
      shippedQuantity: item.shippedQuantity ?? 0,
      settledQuantity: item.settledQuantity ?? 0,
    }));

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_FORM,
        customerId: sale.customerId || "",
        customerName: sale.customerName || "",
        invoiceNumber: sale.invoiceNumber || "",
        invoiceDate: sale.invoiceDate || "",
        paymentDate: sale.paymentDate || "",
        description: sale.description || "",
        status: sale.status ?? "",
        items: formattedItems,
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));