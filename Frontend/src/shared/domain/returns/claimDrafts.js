import { CLAIM_SCOPES, OFF_SCOPE_KINDS } from "./scopes";
import { draftId } from "@/shared/lib/draftId";

/**
 * پیش‌نویسِ ادعاهای فرمِ ثبتِ مرجوعی — مشترک بین خرید و فروش.
 *
 * فرم دو فهرست نگه می‌دارد:
 *
 *  • `lines` — هر قلمِ سند با ادعاهای «روی سند»ش (`line.claims`). سقفِ هر
 *    قلم `line.maxReturnableQuantity` است (سرور: تحویل‌شده − تسویه‌شده −
 *    ادعاهای بازِ مرجوعی‌های دیگر).
 *  • `offScopeClaims` — ادعاهای خارج از سند: مازادِ یک قلم (`EXCESS`، روی
 *    همان قلم و با قیمتِ آن) یا کالای سفارش‌نداده (`UNLISTED`، بی‌قلم).
 *    سقفشان را هر سمت خودش می‌داند و با `capOf` می‌دهد.
 *
 * همه‌ی تابع‌ها خالص‌اند: فهرستِ تازه برمی‌گردانند و هوکِ فرمِ هر سمت آن را
 * در store می‌گذارد. پیش از این، همین منطق خط‌به‌خط در `usePurchaseReturnForm`
 * و `useSalesReturnForm` تکرار شده بود.
 */

/** ادعای خالی با مشکلِ پیش‌فرضِ همان دسته. */
export const newClaimDraft = (problem, quantity) => ({
  id: draftId(),
  problem,
  quantity,
  note: "",
});

/** جمعِ مقدارِ یک فهرستِ ادعا (ورودی‌های فرم ممکن است رشته باشند). */
export const sumClaimQuantity = (claims = []) =>
  claims.reduce((sum, claim) => sum + (Number(claim.quantity) || 0), 0);

/** عددِ ورودی، بریده به بازه‌ی `[0, max]`؛ ورودیِ نامعتبر صفر می‌شود. */
function clampInput(value, max = Infinity) {
  const number = Number(value);
  if (Number.isNaN(number) || number < 0) return 0;
  return Math.min(number, max);
}

// ─── ادعاهای روی قلمِ سند ──────────────────────────────────────────────────

const mapLine = (lines, lineKey, change) =>
  lines.map((line) => (line.lineKey === lineKey ? change(line) : line));

/** ادعای تازه روی یک قلم، با همه‌ی جای خالیِ آن قلم؛ قلمِ پر دست نمی‌خورد. */
export function addLineClaim(lines, lineKey, problem) {
  return mapLine(lines, lineKey, (line) => {
    const room = line.maxReturnableQuantity - sumClaimQuantity(line.claims);
    if (room <= 0) return line;
    return { ...line, claims: [...(line.claims || []), newClaimDraft(problem, room)] };
  });
}

/** تغییرِ یک فیلدِ ادعا؛ مقدار تا سقفِ قلم منهای ادعاهای دیگرِ همان قلم بریده می‌شود. */
export function updateLineClaim(lines, lineKey, claimId, field, value) {
  return mapLine(lines, lineKey, (line) => ({
    ...line,
    claims: (line.claims || []).map((claim) => {
      if (claim.id !== claimId) return claim;
      if (field !== "quantity") return { ...claim, [field]: value };
      const others = sumClaimQuantity(line.claims.filter((c) => c.id !== claimId));
      return { ...claim, quantity: clampInput(value, Math.max(0, line.maxReturnableQuantity - others)) };
    }),
  }));
}

export function removeLineClaim(lines, lineKey, claimId) {
  return mapLine(lines, lineKey, (line) => ({
    ...line,
    claims: (line.claims || []).filter((claim) => claim.id !== claimId),
  }));
}

// ─── ادعاهای خارج از سند ───────────────────────────────────────────────────

/** همان گروهی که سقف دارد: مازاد روی قلمش، سفارش‌نداده روی کالایش. */
const sameOffScopeGroup = (claim, kind, target) =>
  claim.offScopeKind === kind &&
  (kind === OFF_SCOPE_KINDS.EXCESS
    ? claim.orderLineId === target.orderLineId
    : claim.productId === target.productId);

/**
 * یک عدد به ادعای خارج از سندِ همان گروه اضافه می‌کند، یا اگر نیست ادعای
 * تازه‌ای با مقدارِ ۱ می‌سازد. چک کردنِ سقف کارِ فراخوان است.
 *
 * @param target `{ orderLineId, productId, productCode, productName, unit, unitPrice }`
 *   — مازاد قلمِ سند و قیمتش را می‌خواهد؛ سفارش‌نداده فقط کالا.
 */
export function addOffScopeClaim(claims, target, kind, problem) {
  const existing = claims.find((claim) => sameOffScopeGroup(claim, kind, target));
  if (existing) {
    return claims.map((claim) =>
      claim.id === existing.id ? { ...claim, quantity: (Number(claim.quantity) || 0) + 1 } : claim,
    );
  }
  return [
    ...claims,
    {
      ...newClaimDraft(problem, 1),
      offScopeKind: kind,
      orderLineId: kind === OFF_SCOPE_KINDS.EXCESS ? target.orderLineId : null,
      productId: target.productId,
      productCode: target.productCode,
      productName: target.productName,
      unit: target.unit,
      unitPrice: target.unitPrice,
    },
  ];
}

/**
 * تغییرِ یک فیلدِ ادعای خارج از سند.
 *
 * قیمتِ مازاد قیمتِ قلمِ سند است و سرور مقدارِ دیگری را رد می‌کند، پس قفل
 * است. `capOf(claim)` سقفِ مقدارِ همین ادعاست (سقفِ گروه منهای بقیه‌ی
 * ادعاهای همان گروه)؛ بدونِ آن مقدار فقط منفی نمی‌شود.
 */
export function updateOffScopeClaim(claims, claimId, field, value, capOf = () => Infinity) {
  return claims.map((claim) => {
    if (claim.id !== claimId) return claim;
    if (field === "unitPrice") {
      if (claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS) return claim;
      return { ...claim, unitPrice: clampInput(value) };
    }
    if (field === "quantity") return { ...claim, quantity: clampInput(value, capOf(claim)) };
    return { ...claim, [field]: value };
  });
}

export const removeOffScopeClaim = (claims, claimId) =>
  claims.filter((claim) => claim.id !== claimId);

// ─── خروجی ─────────────────────────────────────────────────────────────────

/**
 * ادعاهای پر‌شده‌ی فرم، به شکلی که `toApiClaim` می‌خواهد. ادعای با مقدارِ
 * صفر فرستاده نمی‌شود (نیمه‌کاره است، نه خطا).
 */
export function claimsPayloadOf(lines, offScopeClaims) {
  const onOrder = lines.flatMap((line) =>
    (line.claims || [])
      .filter((claim) => (Number(claim.quantity) || 0) > 0)
      .map((claim) => ({
        scope: CLAIM_SCOPES.ON_ORDER,
        offScopeKind: null,
        orderLineId: line.orderLineId,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        unit: line.unit,
        unitPrice: Number(line.unitPrice) || 0,
        quantity: Number(claim.quantity) || 0,
        problem: claim.problem,
        note: claim.note || "",
      })),
  );

  const offScope = offScopeClaims
    .filter((claim) => (Number(claim.quantity) || 0) > 0)
    .map((claim) => ({
      scope: CLAIM_SCOPES.OFF_ORDER,
      offScopeKind: claim.offScopeKind,
      orderLineId: claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS ? claim.orderLineId : null,
      productId: claim.productId,
      productCode: claim.productCode,
      productName: claim.productName,
      unit: claim.unit,
      unitPrice: Number(claim.unitPrice) || 0,
      quantity: Number(claim.quantity) || 0,
      problem: claim.problem,
      note: claim.note || "",
    }));

  return [...onOrder, ...offScope];
}

/** ارزشِ ادعاها به قیمتِ قلم/ادعا — پیش‌نمایشِ «مبلغ ادعا»ی سند پیش از ثبت. */
export const claimsAmountOf = (claims) =>
  claims.reduce((sum, claim) => sum + claim.quantity * claim.unitPrice, 0);
