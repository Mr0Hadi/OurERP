import { create } from "zustand";
import { CLAIM_SCOPES } from "@/shared/domain/returns/scopes";

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
  // همه‌ی خطوط فاکتور — مبنای انتخابِ ادعای «مازاد» (حتی خطِ کامل‌تسویه‌شده)
  orderLines: [],
  // ادعاهای «خارج از فاکتور» — کالایی که سفارش توجیهش نمی‌کند
  offInvoiceClaims: [],
  // سقفِ ادعای مازاد برای هر خط (`claimableExcessQuantity`)، کلید: `orderLineId`
  excessCaps: {},
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

  /** `sale` همان `SaleDto`ِ `GetSaleDetail` است. */
  initializeForSale: (sale) => {
    // `GetSaleDetail` فیلد `updatedAt` نمی‌دهد، پس کلیدِ نسخه از محتوا
    // ساخته می‌شود: با هر ارسال، ادعا یا تسویه‌ی مرجوعی، سقف‌های خطوط عوض
    // می‌شوند و فرم باید از نو پر شود.
    const version = [
      "sale",
      sale.id,
      sale.status,
      (sale.items || [])
        .map((item) => `${item.id}:${item.claimableQuantity}:${item.claimableExcessQuantity}`)
        .join(","),
    ].join(":");
    if (get().initializedForId === version) return;

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_FORM,
        saleId: sale.id,
        saleInvoiceNumber: sale.invoiceNumber,
        customerId: sale.customerId,
        customerName: sale.customerName,
        orderLines: (sale.items || []).map((item) => ({
          orderLineId: item.id,
          productId: item.productId,
          productCode: item.productCode ?? "",
          productName: item.productName,
          unit: item.unit ?? "",
          unitPrice: item.unitPrice,
        })),
        excessCaps: Object.fromEntries(
          (sale.items || []).map((item) => [item.id, Number(item.claimableExcessQuantity) || 0]),
        ),
        lines: (sale.items || [])
          // سقفِ ادعا همان عددی است که `CreateSaleReturn` چک می‌کند:
          // ارسال‌شده − تسویه‌شده − ادعاهای بازِ مرجوعی‌های دیگر.
          .filter((item) => item.claimableQuantity > 0)
          .map((item) => ({
            // کلیدِ ردیف و شناسه‌ی خط هر دو از `item.id` می‌آیند، نه از
            // `productId`: یک کالا می‌تواند در دو خط فاکتور با قیمت
            // متفاوت باشد و آن دو خط سهمیه‌ی جدا دارند.
            lineKey: `${sale.id}-${item.id}`,
            // `CreateReturnClaimDto.OrderLineId` — سمتِ فروش یعنی `SaleItemId`.
            orderLineId: item.id,
            scope: CLAIM_SCOPES.ON_ORDER,
            productId: item.productId,
            productCode: item.productCode ?? "",
            productName: item.productName,
            unit: item.unit ?? "",
            unitPrice: item.unitPrice,
            deliveredQuantity: item.shippedQuantity,
            maxReturnableQuantity: item.claimableQuantity,
            claims: [],
          })),
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));
