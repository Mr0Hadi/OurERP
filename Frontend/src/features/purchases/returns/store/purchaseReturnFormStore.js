import { create } from "zustand";
import { CLAIM_SCOPES } from "@/shared/domain/returns/scopes";

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

  /**
   * `purchase` همان `PurchaseReceivingInfoDto`ِ `GetPurchaseReceivingInfo`
   * است — همان کوئری‌ای که صفحه‌ی دریافت انبار هم از آن می‌خواند.
   */
  initializeForPurchase: (purchase) => {
    // این پاسخ `updatedAt` ندارد، پس کلیدِ نسخه از محتوا ساخته می‌شود:
    // با هر دورِ دریافت یا هر مرجوعیِ تازه، `receivedQuantity`ها عوض
    // می‌شوند و فرم باید از نو پر شود.
    const version = [
      "purchase",
      purchase.purchaseId,
      purchase.status,
      (purchase.items || [])
        .map((item) => `${item.purchaseItemId}:${item.receivedQuantity}`)
        .join(","),
    ].join(":");
    if (get().initializedForId === version) return;

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_FORM,
        purchaseId: purchase.purchaseId,
        purchaseInvoiceNumber: purchase.invoiceNumber,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        lines: (purchase.items || [])
          // فقط قلمی که چیزی از آن تحویل گرفته‌ایم قابل ادعاست: سقفِ
          // ادعا در بکند `ReceivedQuantity − Settled − ادعاهای باز` است،
          // پس روی قلمِ نرسیده هیچ ادعایی پذیرفته نمی‌شود.
          .filter((item) => item.receivedQuantity > 0)
          .map((item) => ({
            // قرینه‌ی سمت فروش: شناسه‌ی خط سفارش، نه شناسه‌ی کالا.
            lineKey: `${purchase.purchaseId}-${item.purchaseItemId}`,
            // `CreateReturnClaimDto.OrderLineId` — سمتِ خرید یعنی
            // `PurchaseItemId` (پاسخِ خواندن همین را با نامِ خودش می‌دهد).
            orderLineId: item.purchaseItemId,
            scope: CLAIM_SCOPES.ON_ORDER,
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            unit: item.unit,
            unitPrice: item.unitPrice,
            deliveredQuantity: item.receivedQuantity,
            // ⚠️ سقفِ واقعی `receivedQuantity − settledQuantity − ادعاهای
            // بازِ مرجوعی‌های دیگر` است، ولی `PurchaseReceivingItemInfoDto`
            // هیچ‌کدام از آن دو کسر را نمی‌دهد. پس این سقف خوش‌بینانه است و
            // حرفِ آخر را خطای ۴۰۰ سرور می‌زند — فرم باید آن را نشان دهد.
            maxReturnableQuantity: item.receivedQuantity,
            claims: [],
          })),
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));
