import { create } from "zustand";
import { CLAIM_SCOPES, OFF_SCOPE_KINDS } from "@/shared/domain/returns/scopes";
import {
  carryOverLineClaims,
  clampClaimsToCaps,
} from "@/shared/domain/returns/carryOverClaims";
import { todayIso } from "@/shared/lib/dateUtils";

// تابع است نه ثابت، تا تاریخِ پیش‌فرض همیشه «امروز»ِ لحظه‌ی ساختِ فرم باشد.
const emptyForm = () => ({
  saleId: "",
  saleInvoiceNumber: "",
  customerId: "",
  customerName: "",
  returnDate: todayIso(),
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
});

export const useSalesReturnFormStore = create((set, get) => ({
  formData: emptyForm(),
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  setLines: (lines) =>
    set((state) => ({ formData: { ...state.formData, lines } })),
  setOffInvoiceClaims: (offInvoiceClaims) =>
    set((state) => ({ formData: { ...state.formData, offInvoiceClaims } })),

  /**
   * `sale` همان `SaleDto`ِ `GetSaleDetail` است؛ `previousReturnId` مرجوعیِ
   * قبلیِ همین مشکل (زنجیره‌ی مرجوعی‌ها).
   */
  initializeForSale: (sale, { previousReturnId = null } = {}) => {
    // `GetSaleDetail` فیلد `updatedAt` نمی‌دهد، پس کلیدِ نسخه از محتوا
    // ساخته می‌شود: با هر ارسال، ادعا یا تسویه‌ی مرجوعی، سقف‌های خطوط عوض
    // می‌شوند و فرم باید تازه شود — با نگه‌داشتنِ ادعاهایی که کاربر تا
    // اینجا وارد کرده (`carryOverClaims`).
    const version = [
      "sale",
      sale.id,
      sale.status,
      (sale.items || [])
        .map((item) => `${item.id}:${item.claimableQuantity}:${item.claimableExcessQuantity}`)
        .join(","),
    ].join(":");
    if (get().initializedForId === version) return;

    const excessCaps = Object.fromEntries(
      (sale.items || []).map((item) => [item.id, Number(item.claimableExcessQuantity) || 0]),
    );
    const lines = (sale.items || [])
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
      }));

    const previous = get().formData;
    const isResync = get().initializedForId != null && previous.saleId === sale.id;

    set({
      initializedForId: version,
      formData: {
        // تاریخ و توضیحاتِ واردشده هم با تازه‌شدنِ ارقام نمی‌روند.
        ...(isResync ? previous : { ...emptyForm(), previousReturnId }),
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
        excessCaps,
        lines: isResync ? carryOverLineClaims(previous.lines, lines) : lines,
        // سقف فقط برای مازاد است؛ کالای سفارش‌نداده سقفی سمتِ فرم ندارد.
        offInvoiceClaims: isResync
          ? clampClaimsToCaps(
              previous.offInvoiceClaims,
              (claim) =>
                claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS ? claim.orderLineId : claim.id,
              (key) => excessCaps[key] ?? Infinity,
            )
          : [],
      },
    });
  },

  resetForm: () => set({ formData: emptyForm(), initializedForId: null }),
}));
