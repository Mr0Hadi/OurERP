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

function mostFrequent(values) {
  if (!values.length) return "shortage";
  const counts = new Map();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export const usePurchaseReturnFormStore = create((set, get) => ({
  formData: { ...EMPTY_RETURN },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  setItems: (items) =>
    set((state) => ({ formData: { ...state.formData, items } })),

  /**
   * فرم ثبت مرجوعی را دقیقاً از روی گزارش کسریِ ثبت‌شده توسط انباردار
   * پر می‌کند. کلید نسخه شامل purchaseUpdatedAt است، نه فقط
   * purchaseId — چون در دور دوم (یا بیشتر) مرجوعی‌کردن همان خرید،
   * purchaseId عوض نمی‌شود ولی updatedAt چرا؛ بدون این، اگر یک
   * اسنپ‌شات قدیمی زودتر از دیتای تازه رندر شود، فرم دیگر با دیتای
   * تازه بازسازی نمی‌شد (همان چیزی که باعث می‌شد در اولین بازدید،
   * اطلاعات نادرست نمایش داده شود).
   */
  initializeForReport: (report) => {
    const version = `report:${report.purchaseId}:${report.purchaseUpdatedAt}`;
    if (get().initializedForId === version) return;

    const items = report.items.map((entry) => ({
      issueId: entry.issueId,
      productId: entry.productId,
      productCode: entry.productCode,
      productName: entry.productName,
      unit: entry.unit,
      unitPrice: entry.unitPrice,
      orderedQty: entry.orderedQty,
      maxReturnableQty: entry.openShortageQty,
      qty: entry.openShortageQty,
      reason: entry.issueType,
      note: entry.issueNote || "",
    }));

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_RETURN,
        purchaseId: report.purchaseId,
        purchaseInvoiceNumber: report.invoiceNumber,
        supplierId: report.supplierId,
        supplierName: report.supplierName,
        reason: mostFrequent(report.items.map((i) => i.issueType)),
        items,
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_RETURN }, initializedForId: null }),
}));