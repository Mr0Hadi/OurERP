import { StocktakeCountModeEnum, StocktakeStatusEnum } from "@/shared/domain/enums/stocktake";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * منطقِ خالصِ انبارگردانی: پیش‌نویسِ ساخت، کارهای مجاز در هر وضعیت، خلاصه‌ی اسکن و فیلترِ ردیف‌ها. قاعده‌های اصلی
 * (کور بودن، مغایرت، اثرِ تأیید) سمتِ سرورند؛ این‌جا فقط چیزی است که صفحه برای نمایش لازم دارد.
 */

/** دامنه‌ی انبارگردانی؛ سرور یکی از این‌ها را می‌پذیرد (دسته و برند با هم هم می‌شود). */
export const STOCKTAKE_SCOPE = Object.freeze({
  CATEGORY_BRAND: "categoryBrand",
  BIN: "bin",
  PRODUCTS: "products",
});

export const STOCKTAKE_SCOPE_LABELS = Object.freeze({
  [STOCKTAKE_SCOPE.CATEGORY_BRAND]: "دسته یا برند",
  [STOCKTAKE_SCOPE.BIN]: "قفسه",
  [STOCKTAKE_SCOPE.PRODUCTS]: "کالاهای انتخابی",
});

export const emptyStocktakeDraft = () => ({
  title: "",
  scope: STOCKTAKE_SCOPE.CATEGORY_BRAND,
  productCategoryId: "",
  brand: "",
  binLocationPrefix: "",
  products: [],
  note: "",
});

/** خطاهای پیش‌نویس، با پیامِ فارسی؛ `{}` یعنی قابلِ ارسال. */
export function stocktakeDraftErrors(draft) {
  const errors = {};
  if (!draft.title.trim()) errors.title = "عنوانِ انبارگردانی را بنویسید";
  if (draft.scope === STOCKTAKE_SCOPE.CATEGORY_BRAND && !draft.productCategoryId && !draft.brand.trim()) {
    errors.scope = "دسته یا برند را انتخاب کنید";
  }
  if (draft.scope === STOCKTAKE_SCOPE.BIN && !draft.binLocationPrefix.trim()) errors.scope = "قفسه را بنویسید";
  if (draft.scope === STOCKTAKE_SCOPE.PRODUCTS && draft.products.length === 0) errors.scope = "دست‌کم یک کالا انتخاب کنید";
  return errors;
}

/** بدنه‌ی `CreateStocktake`؛ فقط فیلدهای دامنه‌ی انتخاب‌شده فرستاده می‌شوند. `warehouseId` با چندانبار (GAP-08) می‌آید. */
export function toApiStocktake(draft) {
  const text = (value) => value.trim() || null;
  return {
    title: draft.title.trim(),
    warehouseId: null,
    productCategoryId:
      draft.scope === STOCKTAKE_SCOPE.CATEGORY_BRAND && draft.productCategoryId ? Number(draft.productCategoryId) : null,
    brand: draft.scope === STOCKTAKE_SCOPE.CATEGORY_BRAND ? text(draft.brand) : null,
    binLocationPrefix: draft.scope === STOCKTAKE_SCOPE.BIN ? text(draft.binLocationPrefix) : null,
    productIds: draft.scope === STOCKTAKE_SCOPE.PRODUCTS ? draft.products.map((product) => product.id) : null,
    note: text(draft.note),
  };
}

/**
 * کارهای مجاز روی یک انبارگردانی، از وضعیت و دسترسی‌ها (همان قاعده‌ی کنترلر). `allows` از `usePermission`.
 * لغو پیش از تأیید هر وقت ممکن است.
 */
export function stocktakeActions(stocktake, allows) {
  const counting = stocktake?.status === StocktakeStatusEnum.COUNTING;
  const submitted = stocktake?.status === StocktakeStatusEnum.SUBMITTED;
  const canCount = counting && allows("StocktakeCount");
  const canApprove = allows("StocktakeApprove");
  return {
    canCount,
    canSubmit: canCount,
    canReopen: submitted && canApprove,
    canApprove: submitted && canApprove,
    canCancel: (counting || submitted) && canApprove,
  };
}

const sumScanned = (stocktake) => (stocktake?.lines ?? []).reduce((sum, line) => sum + (Number(line.scannedCount) || 0), 0);

/**
 * نتیجه‌ی یک اسکن از مقایسه‌ی سند پیش و پس از آن — پیامِ سرور از interceptor برنمی‌گردد.
 *
 * @param before سند پیش از اسکن
 * @param after  پاسخِ `ScanStocktakeUnits`
 * @param sent   بارکدهای فرستاده‌شده
 * @returns `{ added, unknown, repeated }`
 */
export function scanOutcome(before, after, sent) {
  const added = Math.max(0, sumScanned(after) - sumScanned(before));
  const unknown = Math.max(0, (after?.unknownBarcodes?.length ?? 0) - (before?.unknownBarcodes?.length ?? 0));
  const distinct = new Set(sent.map((code) => String(code).trim()).filter(Boolean)).size;
  return { added, unknown, repeated: Math.max(0, distinct - added - unknown) };
}

/** متنِ کوتاهِ همان نتیجه برای toast؛ `tone` برای انتخابِ toast.success/error. */
export function scanOutcomeMessage({ added, unknown, repeated }) {
  const parts = [];
  if (added) parts.push(`${formatNumber(added)} دانه ثبت شد`);
  if (repeated) parts.push(`${formatNumber(repeated)} تکراری`);
  if (unknown) parts.push(`${formatNumber(unknown)} بارکدِ ناشناخته`);
  return { text: parts.join("، ") || "چیزی ثبت نشد", tone: added ? "success" : "error" };
}

export const LINE_FILTER = Object.freeze({
  ALL: "all",
  UNCOUNTED: "uncounted",
  DIFFERENCE: "difference",
});

/**
 * ردیف‌های قابلِ نمایش: جست‌وجو روی نام/کد و فیلترِ «شمرده‌نشده» یا «مغایرت‌دار». در شمارشِ کور `difference`
 * نیامده، پس «مغایرت‌دار» چیزی نشان نمی‌دهد (صفحه آن گزینه را پنهان می‌کند).
 */
export function visibleLines(lines, { search = "", filter = LINE_FILTER.ALL } = {}) {
  const term = search.trim().toLowerCase();
  return lines.filter((line) => {
    if (filter === LINE_FILTER.UNCOUNTED && line.countMode !== StocktakeCountModeEnum.NONE) return false;
    if (filter === LINE_FILTER.DIFFERENCE && !(line.difference || line.unexpectedCount || line.relocatedCount)) return false;
    if (!term) return true;
    return `${line.productName} ${line.productCode}`.toLowerCase().includes(term);
  });
}

/** عددِ دستی فقط وقتی معنا دارد که کالا اسکن نشده (اسکن‌ها ملاک‌اند). */
export const acceptsManualCount = (line) => line.countMode !== StocktakeCountModeEnum.SCAN;

/**
 * دامنه‌ی یک انبارگردانی در یک خط («دسته‌ی لنت · برندِ بوش»). سرور نامِ دسته را نمی‌فرستد؛ `categoryName` از
 * فهرستِ دسته‌ها می‌آید. بی دسته/برند/قفسه یعنی کالاهای انتخابی.
 */
export function scopeSummary(stocktake, categoryName) {
  const parts = [];
  if (stocktake.productCategoryId) parts.push(`دسته‌ی ${categoryName ?? `#${stocktake.productCategoryId}`}`);
  if (stocktake.brand) parts.push(`برندِ ${stocktake.brand}`);
  if (stocktake.binLocationPrefix) parts.push(`قفسه‌ی ${stocktake.binLocationPrefix}`);
  return parts.join(" · ") || STOCKTAKE_SCOPE_LABELS[STOCKTAKE_SCOPE.PRODUCTS];
}
