import { create } from "zustand";
import { CLAIM_SCOPES } from "../domain/returnVocabulary";

const EMPTY_FORM = {
  saleId: "",
  saleInvoiceNumber: "",
  customerId: "",
  customerName: "",
  returnDate: new Date().toISOString().slice(0, 10),
  description: "",
  previousReturnId: null,
  // هر خط فاکتور، با ادعاهای «روی فاکتور»ش
  lines: [],
  // ادعاهای «خارج از فاکتور» — کالایی که سفارش توجیهش نمی‌کند
  offInvoiceClaims: [],
};

export const useSalesReturnFormStore = create((set, get) => ({
  formData: { ...EMPTY_FORM },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  setLines: (lines) =>
    set((state) => ({ formData: { ...state.formData, lines } })),
  setOffInvoiceClaims: (offInvoiceClaims) =>
    set((state) => ({ formData: { ...state.formData, offInvoiceClaims } })),

  initializeForSale: (sale) => {
    const version = `sale:${sale.saleId}:${sale.saleUpdatedAt}`;
    if (get().initializedForId === version) return;

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_FORM,
        saleId: sale.saleId,
        saleInvoiceNumber: sale.invoiceNumber,
        customerId: sale.customerId,
        customerName: sale.customerName,
        lines: sale.items.map((item) => ({
          // کلیدِ ردیف و شناسه‌ی خط هر دو از `item.id` می‌آیند، نه از
          // `productId`: یک کالا می‌تواند در دو خط فاکتور با قیمت
          // متفاوت باشد و آن دو خط سهمیه‌ی جدا دارند.
          lineKey: `${sale.saleId}-${item.id}`,
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
