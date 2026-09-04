// store/purchaseFormStore.js
import { create } from "zustand";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";

const EMPTY_FORM = {
  supplierId: "",
  supplierName: "",
  invoiceNumber: "",
  invoiceDate: "",
  dueDate: "",
  description: "",
  paymentType: PaymentTypeEnum.CASH,
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
        dueDate: purchaseData.dueDate || "",
        description: purchaseData.description || "",
        paymentType: purchaseData.paymentType ?? PaymentTypeEnum.CASH,
        paidAmount: purchaseData.paidAmount?.toString() || "",
        checkNumber: purchaseData.checkNumber || "",
        transferRef: purchaseData.transferRef || "",
        mixedPayments: purchaseData.mixedPayments || [],
        status: purchaseData.status ?? "",
        items: formattedItems,
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));
