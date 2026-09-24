import {
  ProductUnitStatusEnum as UNIT_STATUSES,
  UnitCustodyReasonEnum as CUSTODY,
  UNIT_STATUS_LABELS,
  UNIT_CUSTODY_REASON_LABELS,
  PURCHASE_CUSTODY_REASONS,
} from "@/shared/domain/enums/unitStatus";
import { ROUTES } from "@/shared/constants/routes";
import { gregorianToPersian } from "@/shared/lib/dateUtils";

/**
 * واژگانِ صفحه‌ی «دانه‌ها و برچسب‌ها» — هر قاعده‌ای که به یک دانه‌ی فیزیکی
 * برمی‌گردد و بیش از یک کامپوننت لازمش دارد.
 *
 * قرارداد با بکند در `Backend-Net/docs/product-unit-management-requirements.fa.md`
 * است؛ شماره‌ی بندها در کامنت‌ها به همان سند اشاره می‌کند.
 */

// ─── نماها ───────────────────────────────────────────────────────────────────

/** چهار تبِ صفحه. سه تای اول یک فهرست‌اند با فیلترِ ثابتِ متفاوت. */
export const UNIT_VIEWS = Object.freeze({
  ALL: "all",
  QUARANTINE: "quarantine",
  UNLABELED: "unlabeled",
  STOCKTAKE: "stocktake",
});

export const UNIT_VIEW_LABELS = Object.freeze({
  [UNIT_VIEWS.ALL]: "همه‌ی دانه‌ها",
  [UNIT_VIEWS.QUARANTINE]: "قرنطینه",
  [UNIT_VIEWS.UNLABELED]: "صف چاپ برچسب",
  [UNIT_VIEWS.STOCKTAKE]: "شمارش دانه‌ای",
});

/** دو حالتِ نوارِ اسکن: باز کردنِ جزئیات، یا افزودنِ پیاپی به انتخاب. */
export const SCAN_MODES = Object.freeze({ OPEN: "open", SELECT: "select" });

// ─── برچسب ───────────────────────────────────────────────────────────────────

/** `UnitLabelStateEnum` — فیلترِ `LabelState` روی فهرست (بند ۱). */
export const UnitLabelStateEnum = Object.freeze({
  UNPRINTED: 1,
  PRINTED: 2,
});

export const UNIT_LABEL_STATE_LABELS = Object.freeze({
  [UnitLabelStateEnum.UNPRINTED]: "برچسب نخورده",
  [UnitLabelStateEnum.PRINTED]: "برچسب خورده",
});

/**
 * دانه‌ای که هنوز در انبار است برچسب لازم دارد — در قفسه یا قرنطینه.
 * فروخته، عودت‌شده یا اسقاط‌شده دیگر در دسترس نیست که برچسب بخورد.
 */
export const LABELABLE_STATUSES = Object.freeze([
  UNIT_STATUSES.IN_STOCK,
  UNIT_STATUSES.QUARANTINED,
]);

export const needsLabel = (unit) =>
  LABELABLE_STATUSES.includes(unit.status) && !(unit.printCount > 0);

// ─── کارهای انبار روی دانه ─────────────────────────────────────────────────

/** `ProductUnitActionEnum` — `POST ApplyProductUnitAction` (بند ۴). */
export const UnitActionEnum = Object.freeze({
  QUARANTINE: 1,
  RELEASE: 2,
  SCRAP: 3,
});

export const UNIT_ACTION_META = Object.freeze({
  [UnitActionEnum.QUARANTINE]: {
    label: "انتقال به قرنطینه",
    verb: "به قرنطینه برود",
    description:
      "دانه از موجودیِ قابل‌فروش بیرون می‌آید و تا تصمیمِ بعدی در قرنطینه می‌ماند. برای کالای مشکوک یا نیازمندِ بررسی.",
    tone: "warning",
  },
  [UnitActionEnum.RELEASE]: {
    label: "آزادسازی به موجودی",
    verb: "به موجودیِ قابل‌فروش برگردد",
    description:
      "بررسی تمام شده و کالا سالم است؛ دوباره قابل فروش می‌شود.",
    tone: "default",
  },
  [UnitActionEnum.SCRAP]: {
    label: "اسقاط",
    verb: "اسقاط شود",
    description:
      "دانه برای همیشه از چرخه خارج و ارزشش به‌عنوان زیان ثبت می‌شود. برگشت‌پذیر نیست.",
    tone: "destructive",
  },
});

/** `UnitActionReasonEnum` — علتِ هر کارِ دستی؛ روی حرکتِ دانه ثبت می‌شود. */
export const UnitActionReasonEnum = Object.freeze({
  DAMAGED_IN_WAREHOUSE: 1,
  DEFECT_FOUND: 2,
  EXPIRED: 3,
  NEEDS_INSPECTION: 4,
  INSPECTION_PASSED: 5,
  OTHER: 9,
});

export const UNIT_ACTION_REASON_LABELS = Object.freeze({
  [UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE]: "آسیب در انبار",
  [UnitActionReasonEnum.DEFECT_FOUND]: "عیبِ کشف‌شده",
  [UnitActionReasonEnum.EXPIRED]: "تاریخ گذشته",
  [UnitActionReasonEnum.NEEDS_INSPECTION]: "نیاز به بررسی",
  [UnitActionReasonEnum.INSPECTION_PASSED]: "بررسی شد — سالم",
  [UnitActionReasonEnum.OTHER]: "سایر موارد",
});

/** علت‌هایی که برای هر کار معنا دارند؛ اولی پیش‌فرض است. */
export const REASONS_BY_ACTION = Object.freeze({
  [UnitActionEnum.QUARANTINE]: [
    UnitActionReasonEnum.NEEDS_INSPECTION,
    UnitActionReasonEnum.DEFECT_FOUND,
    UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE,
    UnitActionReasonEnum.EXPIRED,
    UnitActionReasonEnum.OTHER,
  ],
  [UnitActionEnum.RELEASE]: [
    UnitActionReasonEnum.INSPECTION_PASSED,
    UnitActionReasonEnum.OTHER,
  ],
  [UnitActionEnum.SCRAP]: [
    UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE,
    UnitActionReasonEnum.DEFECT_FOUND,
    UnitActionReasonEnum.EXPIRED,
    UnitActionReasonEnum.OTHER,
  ],
});

/** اسقاط زیانِ مالی است و «سایر» هیچ نمی‌گوید؛ هر دو توضیح می‌خواهند. */
export const noteRequired = (action, reason) =>
  action === UnitActionEnum.SCRAP || reason === UnitActionReasonEnum.OTHER;

/**
 * قرنطینه‌ای که از دریافتِ خرید آمده حسابِ باز با تامین‌کننده دارد (پول
 * پرداخت‌شده، مازادِ پرداخت‌نشده): تکلیفش فقط از مرجوعیِ خرید روشن می‌شود
 * تا آن حساب هم بسته شود. بقیه‌ی قرنطینه را انبار خودش تعیین تکلیف می‌کند.
 */
export const isPurchaseQuarantine = (unit) =>
  unit.status === UNIT_STATUSES.QUARANTINED &&
  PURCHASE_CUSTODY_REASONS.includes(unit.custodyReason);

/** کارهایی که روی این دانه مجازند — همان قاعده‌ی سرور (بند ۴). */
export function allowedActionsOf(unit) {
  if (unit.status === UNIT_STATUSES.IN_STOCK) {
    return [UnitActionEnum.QUARANTINE, UnitActionEnum.SCRAP];
  }
  if (unit.status === UNIT_STATUSES.QUARANTINED && !isPurchaseQuarantine(unit)) {
    return [UnitActionEnum.RELEASE, UnitActionEnum.SCRAP];
  }
  return [];
}

export const canApply = (unit, action) => allowedActionsOf(unit).includes(action);

/**
 * مسیرِ تعیین تکلیف در مرجوعیِ خرید: قرنطینه‌ی دریافت با پیش‌پرشدن از
 * گزارشِ انبار، و کالای معیوبِ برگشتی از مشتری روی خریدی که از آن آمده بود.
 */
export function purchaseReturnRouteOf(unit) {
  if (unit.status !== UNIT_STATUSES.QUARANTINED || !unit.purchaseId) return null;
  const base = `${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=${unit.purchaseId}`;
  if (isPurchaseQuarantine(unit)) return `${base}&prefill=quarantine`;
  if (unit.custodyReason === CUSTODY.CUSTOMER_RETURN) return base;
  return null;
}

// ─── «کجاست؟» ───────────────────────────────────────────────────────────────

/**
 * جای فعلیِ دانه به زبانِ انباردار — ستونِ «کجاست» و سربرگِ جزئیات:
 * `place` جا، `detail` طرفِ حساب یا علت، `document` شماره‌ی سندِ مرتبط.
 */
export function whereaboutsOf(unit) {
  switch (unit.status) {
    case UNIT_STATUSES.IN_STOCK:
      return { place: "انبار", detail: "قابل فروش" };
    case UNIT_STATUSES.QUARANTINED:
      return {
        place: "انبار · قرنطینه",
        detail: UNIT_CUSTODY_REASON_LABELS[unit.custodyReason] ?? "منتظر تصمیم",
      };
    case UNIT_STATUSES.SOLD:
      return {
        place: "نزد مشتری",
        detail: unit.customerName ?? "",
        document: unit.saleInvoiceNumber,
      };
    case UNIT_STATUSES.RETURNED_TO_SUPPLIER:
      return { place: "نزد تامین‌کننده", detail: unit.supplierName ?? "" };
    case UNIT_STATUSES.SCRAPPED:
      return { place: "اسقاط‌شده", detail: "خارج از چرخه" };
    default:
      return { place: UNIT_STATUS_LABELS[unit.status] ?? "—", detail: "" };
  }
}

// ─── سندها ───────────────────────────────────────────────────────────────────

/** `DocumentKindEnum` بکند — روی حرکت‌ها و منشأ قرنطینه. */
export const DocumentKindEnum = Object.freeze({
  PURCHASE: 1,
  SALE: 2,
  PURCHASE_RETURN: 3,
  SALE_RETURN: 4,
});

const DOCUMENT_ROUTES = {
  [DocumentKindEnum.PURCHASE]: ROUTES.PURCHASES_DETAIL,
  [DocumentKindEnum.SALE]: ROUTES.SALES_DETAIL,
  [DocumentKindEnum.PURCHASE_RETURN]: ROUTES.PURCHASES_RETURNS_DETAIL,
  [DocumentKindEnum.SALE_RETURN]: ROUTES.SALES_RETURNS_DETAIL,
};

export const DOCUMENT_KIND_LABELS = Object.freeze({
  [DocumentKindEnum.PURCHASE]: "خرید",
  [DocumentKindEnum.SALE]: "فروش",
  [DocumentKindEnum.PURCHASE_RETURN]: "مرجوعی خرید",
  [DocumentKindEnum.SALE_RETURN]: "مرجوعی فروش",
});

export const documentRouteOf = (kind, id) =>
  DOCUMENT_ROUTES[kind] && id ? DOCUMENT_ROUTES[kind].replace(":id", id) : null;

// ─── مرتب‌سازی ──────────────────────────────────────────────────────────────

/** `ProductUnitListSortEnum` — شناسه‌ی ستونِ جدول → عددِ بکند. */
export const UNIT_SORT_COLUMNS = Object.freeze({
  serialNumber: 0,
  productName: 1,
  status: 2,
  soldAt: 3,
  createdAt: 4,
  lastPrintedAt: 5,
  quarantinedAt: 6,
});

// ─── نمایش ──────────────────────────────────────────────────────────────────

export const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

export const formatDate = (value) =>
  value ? gregorianToPersian(String(value).slice(0, 10)) : "—";

/** روزهای گذشته از یک تاریخ — «چند وقت است در قرنطینه مانده». */
export function daysSince(value, now = Date.now()) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now - time) / 86_400_000));
}

// ─── فیلترِ مؤثرِ هر تب ─────────────────────────────────────────────────────

/**
 * فیلترِ فرم + فیلترِ ثابتِ تب → آنچه به `GetProductUnitList` می‌رود.
 * فیلتری که تبِ فعلی نشانش نمی‌دهد (مثلاً مشتری در قرنطینه) هم اعمال
 * نمی‌شود، تا کاربر نتیجه‌ای نبیند که دلیلش پنهان است.
 * - قرنطینه: فقط `QUARANTINED`، با علتِ اختیاری.
 * - صفِ چاپ: دانه‌های هنوز در انبار (قفسه یا قرنطینه) که برچسب نخورده‌اند.
 */
export function effectiveUnitFilters(filters) {
  const { view, ...rest } = filters;
  if (view === UNIT_VIEWS.QUARANTINE) {
    return { ...rest, status: UNIT_STATUSES.QUARANTINED, customerId: "" };
  }
  if (view === UNIT_VIEWS.UNLABELED) {
    return {
      ...rest,
      status: "",
      statuses: rest.status ? [rest.status] : LABELABLE_STATUSES,
      labelState: UnitLabelStateEnum.UNPRINTED,
      custodyReason: "",
      customerId: "",
    };
  }
  return { ...rest, custodyReason: "" };
}
