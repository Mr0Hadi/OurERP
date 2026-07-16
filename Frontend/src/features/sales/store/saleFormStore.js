// src/features/sales/store/saleFormStore.js
import { create } from "zustand";

const EMPTY_FORM = {
  customerId: "",
  customerName: "",
  invoiceNumber: "",
  invoiceDate: "",
  dueDate: "",
  description: "",
  paymentType: "cash",
  paidAmount: "",
  checkNumber: "",
  transferRef: "",
  mixedPayments: [], // اضافه شد
  status: "",
  items: [],
};

export const useSaleFormStore = create((set, get) => ({
  formData: { ...EMPTY_FORM },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
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

    const formattedItems = (sale.items || []).map((item) => ({
      productId: item.productId || "",
      productCode: item.productCode || "",
      productName: item.productName || "",
      unit: item.unit || "",
      qty: item.qty || 1,
      unitPrice: item.unitPrice || 0,
      discount: item.discount || 0,
    }));

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_FORM,
        customerId: sale.customerId || "",
        customerName: sale.customerName || "",
        invoiceNumber: sale.invoiceNumber || "",
        invoiceDate: sale.invoiceDate || "",
        dueDate: sale.dueDate || "",
        description: sale.description || "",
        paymentType: sale.paymentType || "cash",
        paidAmount: sale.paidAmount?.toString() || "",
        checkNumber: sale.checkNumber || "",
        transferRef: sale.transferRef || "",
        mixedPayments: sale.mixedPayments || [],
        status: sale.status || "",
        items: formattedItems,
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));
