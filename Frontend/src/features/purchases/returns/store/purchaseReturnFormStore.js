import { create } from "zustand";
import { CLAIM_SCOPES } from "../domain/purchaseReturnVocabulary";

const EMPTY_FORM = {
  purchaseId: "",
  purchaseInvoiceNumber: "",
  supplierId: "",
  supplierName: "",
  returnDate: new Date().toISOString().slice(0, 10),
  description: "",
  previousReturnId: null,
  // هر خط سفارش، با ادعاهای «روی سفارش»ش
  lines: [],
  // ادعاهای «خارج از سفارش» — کالایی که سفارش توجیهش نمی‌کند
  offScopeClaims: [],
};

export const usePurchaseReturnFormStore = create((set, get) => ({
  formData: { ...EMPTY_FORM },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  setLines: (lines) =>
    set((state) => ({ formData: { ...state.formData, lines } })),
  setOffScopeClaims: (offScopeClaims) =>
    set((state) => ({ formData: { ...state.formData, offScopeClaims } })),

  initializeForPurchase: (purchase) => {
    const version = `purchase:${purchase.purchaseId}:${purchase.purchaseUpdatedAt}`;
    if (get().initializedForId === version) return;

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_FORM,
        purchaseId: purchase.purchaseId,
        purchaseInvoiceNumber: purchase.invoiceNumber,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        lines: purchase.items.map((item) => ({
          // قرینه‌ی سمت فروش: شناسه‌ی خط سفارش، نه شناسه‌ی کالا.
          lineKey: `${purchase.purchaseId}-${item.id}`,
          orderLineId: item.id,
          scope: CLAIM_SCOPES.ON_ORDER,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          unitPrice: item.unitPrice,
          deliveredQty: item.deliveredQty,
          maxReturnableQty: item.returnableQty,
          claims: [],
        })),
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));
