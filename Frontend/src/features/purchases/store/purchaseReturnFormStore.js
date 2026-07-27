// src/features/purchases/store/purchaseReturnFormStore.js
import { create } from "zustand";

const EMPTY_RETURN = {
  purchaseId: "",
  purchaseInvoiceNumber: "",
  supplierId: "",
  supplierName: "",
  returnDate: new Date().toISOString().slice(0, 10),
  reason: "shortage",
  description: "",
  items: [],
  status: "pending",
  resolutionType: "none",
  refundAmount: "",
  supplierResponseNote: "",
};

export const usePurchaseReturnFormStore = create((set, get) => ({
  formData: { ...EMPTY_RETURN },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  setItems: (items) =>
    set((state) => ({ formData: { ...state.formData, items } })),

  // مقداردهی اولیه‌ی فرم ثبت مرجوعی جدید بر اساس یک خرید مشخص
  initializeForPurchase: (purchase, prefillProductQty = {}) => {
    const { initializedForId } = get();
    const version = `purchase:${purchase.id}`;
    if (initializedForId === version) return;

    const items = purchase.items
      .filter(
        (item) =>
          item.maxReturnableQty > 0 || prefillProductQty[item.productId],
      )
      .map((item) => {
        const prefillQty = prefillProductQty[item.productId] || 0;
        const qty = Math.max(0, Math.min(prefillQty, item.maxReturnableQty));
        return {
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          orderedQty: item.orderedQty,
          alreadyReturnedQty: item.alreadyReturnedQty,
          maxReturnableQty: item.maxReturnableQty,
          unitPrice: item.unitPrice,
          qty,
          reason: "shortage",
          note: "",
        };
      });

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_RETURN,
        purchaseId: purchase.id,
        purchaseInvoiceNumber: purchase.invoiceNumber,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        items,
      },
    });
  },

  initializeFromReturn: (returnData) => {
    const { initializedForId } = get();
    const version = `edit:${returnData.id}:${returnData.updatedAt}`;
    if (initializedForId === version) return;

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_RETURN,
        ...returnData,
        refundAmount: returnData.refundAmount?.toString() || "",
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_RETURN }, initializedForId: null }),
}));