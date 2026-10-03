import { create } from "zustand";
import { EMPTY_PAYMENT_DRAFT } from "@/shared/components/payments/usePaymentDraft";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";

const EMPTY_FORM = {
  supplierId: "",
  supplierName: "",
  invoiceNumber: "",
  invoiceDate: "",
  paymentDate: "",
  description: "",
  status: "",
  items: [],
  // پرداخت‌های ثبت‌نشده (`usePaymentDraft`) — در store تا رفتن به «کالای جدید» پاکش نکند.
  paymentDraft: EMPTY_PAYMENT_DRAFT,
};

export const usePurchaseFormStore = create((set, get) => ({
  formData: { ...EMPTY_FORM },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),

  /** مثلِ `setState`: مقدار یا تابعِ به‌روزرسان. */
  setPaymentDraft: (next) =>
    set((state) => ({
      formData: {
        ...state.formData,
        paymentDraft: typeof next === "function" ? next(state.formData.paymentDraft) : next,
      },
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

    // `id` و مقدارِ رسیده/تسویه‌شده هم نگه داشته می‌شوند: بدون آن‌ها هر
    // ذخیره‌ی فرم، ردیف‌های سرور را ناشناس می‌کرد و ستون «رسیده» بعد از
    // اولین ویرایش خالی می‌شد.
    const formattedItems = (purchaseData.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      unit: unitLabelOf(item.unit),
      quantity: Number(item.quantity ?? item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      discount: item.discount || 0,
      // نرخ مالیاتی که سرور برای این قلم نگه داشته — پیش‌نمایشِ جمع با آن حساب می‌شود.
      taxPercent: item.taxPercent,
      taxCategory: item.taxCategory,
      receivedQuantity: item.receivedQuantity ?? 0,
      settledQuantity: item.settledQuantity ?? 0,
    }));

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_FORM,
        supplierId: purchaseData.supplierId || "",
        supplierName: purchaseData.supplierName || "",
        invoiceNumber: purchaseData.invoiceNumber || "",
        invoiceDate: purchaseData.invoiceDate || "",
        paymentDate: purchaseData.paymentDate || "",
        description: purchaseData.description || "",
        status: purchaseData.status ?? "",
        items: formattedItems,
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));
