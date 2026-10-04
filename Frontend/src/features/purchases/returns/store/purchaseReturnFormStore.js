import { create } from "zustand";
import { CLAIM_SCOPES, OFF_SCOPE_KINDS } from "@/shared/domain/returns/scopes";
import { RETURN_PROBLEMS } from "@/shared/domain/returns/problems";
import { lineReceivingReport } from "@/shared/domain/returns/receivingReport";
import {
  carryOverLineClaims,
  clampClaimsToCaps,
} from "@/shared/domain/returns/carryOverClaims";
import { newClaimDraft } from "@/shared/domain/returns/claimDrafts";
import {
  claimableQuantityOf,
  freeExcessQuantityOf,
  freeUnlistedQuantityOf,
} from "../domain/purchaseReturnVocabulary";
import { todayIso } from "@/shared/lib/dateUtils";
import { UnitCustodyReasonEnum } from "@/shared/domain/enums/unitStatus";

// تابع است نه ثابت، تا تاریخِ پیش‌فرض همیشه «امروز»ِ لحظه‌ی ساختِ فرم باشد.
const emptyForm = () => ({
  purchaseId: "",
  returnDate: todayIso(),
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
  // مازاد/سفارش‌نداده‌ای که نگه داشته و خریده می‌شود (`AcceptPurchaseExcess`)،
  // کلیدخورده با همان `offScopeCapKey`: { quantity, unitPrice, … }. همان سقفِ
  // ادعای مازاد را می‌خورد — یک دانه یا پس می‌رود یا خریده می‌شود.
  excessPurchases: {},
  // کالای سفارش‌ندادهِ آزادِ قرنطینه، برای انتخابِ «عودت» یا «خرید».
  unlistedStock: [],
});

/**
 * خریدهای قبلی روی سقف‌های تازه: هر گروه تا «سقف − ادعاهای همان گروه» بریده
 * می‌شود؛ گروهی که جایی برایش نماند حذف می‌شود.
 */
function clampPurchases(purchases, offScopeClaims, caps) {
  const claimed = {};
  offScopeClaims.forEach((claim) => {
    const key = offScopeCapKey(claim.offScopeKind, claim);
    claimed[key] = (claimed[key] || 0) + (Number(claim.quantity) || 0);
  });
  return Object.fromEntries(
    Object.entries(purchases)
      .map(([key, entry]) => [
        key,
        {
          ...entry,
          quantity: Math.min(
            Number(entry.quantity) || 0,
            Math.max(0, (caps[key] ?? 0) - (claimed[key] || 0)),
          ),
        },
      ])
      .filter(([, entry]) => entry.quantity > 0),
  );
}

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
    // قرنطینه‌ی پرداخت‌شده‌ی قلم که هنوز رزرو نشده: خرابِ دریافت، برگشتیِ
    // معیوبِ مشتری و نگهداشتِ انبار — ادعای روی سفارش همه را برمی‌دارد.
    const onOrder = Number(item.freeQuarantinedOnOrderQuantity) || 0;
    const line = lines.find((l) => l.orderLineId === item.purchaseItemId);
    if (onOrder > 0 && line) {
      lineClaims.set(item.purchaseItemId, [
        newClaimDraft(
          dominantProblem(
            discrepancies,
            (d) =>
              d.purchaseItemId === item.purchaseItemId &&
              d.custodyReason === UnitCustodyReasonEnum.ON_ORDER,
            RETURN_PROBLEMS.DEFECTIVE,
          ),
          Math.min(onOrder, line.maxReturnableQuantity),
        ),
      ]);
    }

    // سقفِ سرور: قرنطینه منهای آنچه ادعاهای بازِ دیگر رزرو کرده‌اند.
    const excess = freeExcessQuantityOf(item);
    if (excess > 0) {
      offScopeClaims.push({
        ...newClaimDraft(
          dominantProblem(
            discrepancies,
            (d) =>
              d.purchaseItemId === item.purchaseItemId &&
              d.custodyReason === UnitCustodyReasonEnum.EXCESS,
            RETURN_PROBLEMS.OVER_SHIPPED,
          ),
          excess,
        ),
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
      ...newClaimDraft(RETURN_PROBLEMS.UNLISTED_ITEM, free),
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
  formData: emptyForm(),
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  setLines: (lines) =>
    set((state) => ({ formData: { ...state.formData, lines } })),
  setOffScopeClaims: (offScopeClaims) =>
    set((state) => ({ formData: { ...state.formData, offScopeClaims } })),
  setExcessPurchases: (excessPurchases) =>
    set((state) => ({ formData: { ...state.formData, excessPurchases } })),

  /**
   * `purchase` همان `PurchaseReceivingInfoDto`ِ `GetPurchaseReceivingInfo`
   * است — همان کوئری‌ای که صفحه‌ی دریافت انبار هم از آن می‌خواند.
   *
   * `prefillQuarantine` ادعاها را از کالای در قرنطینه پر می‌کند — مسیرِ
   * «ثبت مغایرت» از صفحه‌ی دریافت. فقط بارِ اول؛ اگر همین خرید وسطِ کار
   * عوض شد (مثلاً مازاد از همین صفحه خریده شد)، ادعاهای کاربر با سقف‌های
   * تازه نگه داشته می‌شوند — `carryOverClaims`.
   *
   * `previousReturnId` مرجوعیِ قبلیِ همین مشکل است (زنجیره‌ی مرجوعی‌ها).
   */
  initializeForPurchase: (
    purchase,
    { prefillQuarantine = false, previousReturnId = null } = {},
  ) => {
    // این پاسخ `updatedAt` ندارد، پس کلیدِ نسخه از محتوا ساخته می‌شود:
    // با هر دورِ دریافت، خریدِ مازاد یا مرجوعیِ تازه ارقام عوض می‌شوند و
    // سقف‌های فرم باید تازه شوند.
    const version = [
      "purchase",
      purchase.purchaseId,
      purchase.status,
      prefillQuarantine ? "q" : "",
      (purchase.items || [])
        .map(
          (item) =>
            `${item.purchaseItemId}:${claimableQuantityOf(item)}:${item.freeQuarantinedOnOrderQuantity}:${freeExcessQuantityOf(item)}`,
        )
        .join(","),
    ].join(":");
    if (get().initializedForId === version) return;

    const lines = (purchase.items || [])
      // فقط قلمی که هنوز جا برای ادعا دارد: `claimableQuantity` همان سقفِ
      // بکند است (`ReceivedQuantity − Settled − ادعاهای بازِ دیگر`).
      // قلمی که فقط مازادِ آزاد دارد هم می‌ماند تا برای آن مازاد تصمیم گرفته شود.
      .filter((item) => claimableQuantityOf(item) > 0 || freeExcessQuantityOf(item) > 0)
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

    const offScopeCaps = offScopeCapsOf(purchase);
    const previous = get().formData;
    const isResync =
      get().initializedForId != null &&
      previous.purchaseId === purchase.purchaseId;

    const claims = isResync
      ? {
          lines: carryOverLineClaims(previous.lines, lines),
          offScopeClaims: clampClaimsToCaps(
            previous.offScopeClaims,
            (claim) => offScopeCapKey(claim.offScopeKind, claim),
            (key) => offScopeCaps[key] ?? 0,
          ),
        }
      : prefillQuarantine
        ? quarantineClaimsOf(purchase, lines)
        : { lines, offScopeClaims: [] };

    set({
      initializedForId: version,
      formData: {
        // تاریخ و توضیحاتِ واردشده هم با تازه‌شدنِ ارقام نمی‌روند.
        ...(isResync ? previous : { ...emptyForm(), previousReturnId }),
        purchaseId: purchase.purchaseId,
        orderLines,
        lines: claims.lines,
        offScopeClaims: claims.offScopeClaims,
        offScopeCaps,
        excessPurchases: isResync
          ? clampPurchases(previous.excessPurchases || {}, claims.offScopeClaims, offScopeCaps)
          : {},
        unlistedStock: (purchase.unlistedItems || [])
          .filter((item) => freeUnlistedQuantityOf(item) > 0)
          .map((item) => ({
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            unit: item.unit,
          })),
      },
    });
  },

  resetForm: () => set({ formData: emptyForm(), initializedForId: null }),
}));
