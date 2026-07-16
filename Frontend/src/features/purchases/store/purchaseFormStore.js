// store/purchaseFormStore.js
import { create } from "zustand";

const EMPTY_FORM = {
  supplierId: "",
  supplierName: "",
  invoiceNumber: "",
  invoiceDate: "",
  dueDate: "",
  description: "",
  paymentType: "cash",
  paidAmount: "",
  checkNumber: "",
  transferRef: "",
  mixedPayments: [],
  status: "",
  items: [],
};

export const usePurchaseFormStore = create((set, get) => ({
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
    set({ initializedForId: "new", formData: { ...EMPTY_FORM } });
  },

  initializeFromPurchase: (purchaseData) => {
    const { initializedForId } = get();
    const version = `${purchaseData.id}:${purchaseData.updatedAt}`;
    if (initializedForId === version) return;

    const formattedItems = (purchaseData.items || []).map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      unit: item.unit || "",
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      receivedQty: item.receivedQty ?? null,
    }));

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_FORM,
        supplierId: purchaseData.supplierId || "",
        supplierName: purchaseData.supplierName || "",
        invoiceNumber: purchaseData.invoiceNumber || "",
        invoiceDate: purchaseData.invoiceDate || "",
        dueDate: purchaseData.dueDate || "",
        description: purchaseData.description || "",
        paymentType: purchaseData.paymentType || "cash",
        paidAmount: purchaseData.paidAmount?.toString() || "",
        checkNumber: purchaseData.checkNumber || "",
        transferRef: purchaseData.transferRef || "",
        mixedPayments: purchaseData.mixedPayments || [],
        status: purchaseData.status || "",
        items: formattedItems,
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));
    