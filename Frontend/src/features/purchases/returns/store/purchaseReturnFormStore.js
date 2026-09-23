import { create } from "zustand";
import { CLAIM_SCOPES, OFF_SCOPE_KINDS } from "@/shared/domain/returns/scopes";
import { RETURN_PROBLEMS } from "@/shared/domain/returns/problems";
import { lineReceivingReport } from "@/shared/domain/returns/receivingReport";
import {
  claimableQuantityOf,
  freeExcessQuantityOf,
  freeUnlistedQuantityOf,
} from "../domain/purchaseReturnVocabulary";

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
  // همه‌ی خطوط سفارش — مبنای انتخابِ ادعای «مازاد»
  orderLines: [],
  // ادعاهای «خارج از سفارش» — کالایی که سفارش توجیهش نمی‌کند
  offScopeClaims: [],
  // سقفِ سرور برای ادعاهای خارج از سفارش، کلیدخورده با `offScopeCapKey`
  offScopeCaps: {},
};

/**
 * کلیدِ سقفِ یک ادعای خارج از سفارش: مازاد روی قلمش، سفارش‌نداده روی کالایش
 * — همان گروه‌بندی‌ای که `CreatePurchaseReturn` سقف را رویش چک می‌کند.
 */
export const offScopeCapKey = (kind, { orderLineId, productId }) =>
  kind === OFF_SCOPE_KINDS.EXCESS ? `excess:${orderLineId}` : `unlisted:${productId}`;

/** `freeExcessQuantity`/`freeQuantity`: قرنطینه منهای رزروِ ادعاهای بازِ دیگر. */
function offScopeCapsOf(purchase) {
  const caps = {};
  (purchase.items || []).forEach((item) => {
    caps[offScopeCapKey(OFF_SCOPE_KINDS.EXCESS, { orderLineId: item.purchaseItemId })] =
      freeExcessQuantityOf(item);
  });
  (purchase.unlistedItems || []).forEach((item) => {
    caps[offScopeCapKey(OFF_SCOPE_KINDS.UNLISTED, { productId: item.productId })] =
      freeUnlistedQuantityOf(item);
  });
  return caps;
}

// `UnitCustodyReasonEnum` بکند — فقط برای خواندنِ مغایرت‌های دریافت.
const CUSTODY_REASONS = { ON_ORDER: 1, EXCESS: 2, UNLISTED: 3 };

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * پرتکرارترین مشکلی که انبار برای این دسته ثبت کرده — فقط پیشنهادِ فرم؛
 * کاربر می‌تواند عوضش کند.
 */
function dominantProblem(discrepancies, matches, fallback) {
  const totals = new Map();
  discrepancies.filter(matches).forEach((d) => {
    totals.set(d.problem, (totals.get(d.problem) || 0) + (Number(d.quantity) || 0));
  });
  let best = fallback;
  let bestQuantity = 0;
  totals.forEach((quantity, problem) => {
    if (quantity > bestQuantity) {
      best = problem;
      bestQuantity = quantity;
    }
  });
  return best;
}

/**
 * ادعاهای پیش‌پرشده از کالای در قرنطینه‌ی همین خرید.
 *
 * مقدارها از شمارِ دانه‌های قرنطینه می‌آیند (همان سقفی که سرور چک
 * می‌کند)، نه از جمعِ مغایرت‌ها؛ مغایرت‌ها فقط نوعِ مشکل را پیشنهاد می‌دهند.
 */
function quarantineClaimsOf(purchase, lines) {
  const discrepancies = purchase.discrepancies || [];
  const lineClaims = new Map();
  const offScopeClaims = [];

  (purchase.items || []).forEach((item) => {
    const onOrder = Number(item.quarantinedOnOrderQuantity) || 0;
    const line = lines.find((l) => l.orderLineId === item.purchaseItemId);
    if (onOrder > 0 && line) {
      lineClaims.set(item.purchaseItemId, [
        {
          id: generateId(),
          problem: dominantProblem(
            discrepancies,
            (d) =>
              d.purchaseItemId === item.purchaseItemId &&
              d.custodyReason === CUSTODY_REASONS.ON_ORDER,
            RETURN_PROBLEMS.DEFECTIVE,
          ),
          quantity: Math.min(onOrder, line.maxReturnableQuantity),
          note: "",
        },
      ]);
    }

    // سقفِ سرور: قرنطینه منهای آنچه ادعاهای بازِ دیگر رزرو کرده‌اند.
    const excess = freeExcessQuantityOf(item);
    if (excess > 0) {
      offScopeClaims.push({
        id: generateId(),
        problem: dominantProblem(
          discrepancies,
          (d) =>
            d.purchaseItemId === item.purchaseItemId &&
            d.custodyReason === CUSTODY_REASONS.EXCESS,
          RETURN_PROBLEMS.OVER_SHIPPED,
        ),
        quantity: excess,
        note: "",
        offScopeKind: OFF_SCOPE_KINDS.EXCESS,
        orderLineId: item.purchaseItemId,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        unitPrice: item.unitPrice,
      });
    }
  });

  (purchase.unlistedItems || []).forEach((item) => {
    const free = freeUnlistedQuantityOf(item);
    if (free <= 0) return;
    offScopeClaims.push({
      id: generateId(),
      problem: RETURN_PROBLEMS.UNLISTED_ITEM,
      quantity: free,
      note: "",
      offScopeKind: OFF_SCOPE_KINDS.UNLISTED,
      orderLineId: null,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      // کالای سفارش‌نداده پولی بابتش پرداخت نشده؛ قیمتِ معامله را کاربر وارد می‌کند.
      unitPrice: 0,
    });
  });

  return {
    lines: lines.map((line) =>
      lineClaims.has(line.orderLineId)
        ? { ...line, claims: lineClaims.get(line.orderLineId) }
        : line,
    ),
    offScopeClaims,
  };
}

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
   *
   * `prefillQuarantine` ادعاها را از کالای در قرنطینه پر می‌کند — مسیرِ
   * «ثبت مغایرت» از صفحه‌ی دریافت.
   */
  initializeForPurchase: (purchase, { prefillQuarantine = false } = {}) => {
    // این پاسخ `updatedAt` ندارد، پس کلیدِ نسخه از محتوا ساخته می‌شود:
    // با هر دورِ دریافت یا هر مرجوعیِ تازه، ارقام عوض می‌شوند و فرم باید
    // از نو پر شود.
    const version = [
      "purchase",
      purchase.purchaseId,
      purchase.status,
      prefillQuarantine ? "q" : "",
      (purchase.items || [])
        .map(
          (item) =>
            `${item.purchaseItemId}:${claimableQuantityOf(item)}:${item.quarantinedOnOrderQuantity}:${freeExcessQuantityOf(item)}`,
        )
        .join(","),
    ].join(":");
    if (get().initializedForId === version) return;

    const lines = (purchase.items || [])
      // فقط قلمی که هنوز جا برای ادعا دارد: `claimableQuantity` همان سقفِ
      // بکند است (`ReceivedQuantity − Settled − ادعاهای بازِ دیگر`).
      .filter((item) => claimableQuantityOf(item) > 0)
      .map((item) => ({
        lineKey: `${purchase.purchaseId}-${item.purchaseItemId}`,
        // `CreateReturnClaimDto.OrderLineId` — سمتِ خرید یعنی `PurchaseItemId`.
        orderLineId: item.purchaseItemId,
        scope: CLAIM_SCOPES.ON_ORDER,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        unitPrice: item.unitPrice,
        deliveredQuantity: item.receivedQuantity,
        maxReturnableQuantity: claimableQuantityOf(item),
        // آنچه انباردار موقعِ دریافتِ همین قلم ثبت کرده — فقط نمایش.
        receivingReport: lineReceivingReport(purchase, item.purchaseItemId),
        claims: [],
      }));

    const orderLines = (purchase.items || []).map((item) => ({
      orderLineId: item.purchaseItemId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      unitPrice: item.unitPrice,
    }));

    const prefilled = prefillQuarantine
      ? quarantineClaimsOf(purchase, lines)
      : { lines, offScopeClaims: [] };

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_FORM,
        purchaseId: purchase.purchaseId,
        purchaseInvoiceNumber: purchase.invoiceNumber,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        orderLines,
        lines: prefilled.lines,
        offScopeClaims: prefilled.offScopeClaims,
        offScopeCaps: offScopeCapsOf(purchase),
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));
