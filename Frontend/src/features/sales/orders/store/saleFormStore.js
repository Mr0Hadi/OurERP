import { create } from "zustand";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";

const EMPTY_FORM = {
  customerId: "",
  customerName: "",
  invoiceNumber: "",
  invoiceDate: "",
  dueDate: "",
  description: "",
  paymentType: PaymentTypeEnum.CASH,
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
        dueDate: sale.dueDate || "",
        description: sale.description || "",
        paymentType: sale.paymentType ?? PaymentTypeEnum.CASH,
        paidAmount: sale.paidAmount?.toString() || "",
        checkNumber: sale.checkNumber || "",
        transferRef: sale.transferRef || "",
        mixedPayments: sale.mixedPayments || [],
        status: sale.status ?? "",
        items: formattedItems,
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));