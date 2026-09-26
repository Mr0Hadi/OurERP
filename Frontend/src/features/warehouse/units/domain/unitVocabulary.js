import {
  ProductUnitStatusEnum as UNIT_STATUSES,
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
 * قرارداد با بکند در `Backend-Net/docs/frontend-requests.fa.md` (بخشِ ۴)
 * است؛ شماره‌ی بندها در کامنت‌ها به همان سند اشاره می‌کند.
 */

// ─── جایگاه ─────────────────────────────────────────────────────────────────

/**
 * جایگاهِ دانه — نوارِ بالای فهرست. هر جایگاه یک وضعیتِ سرور است؛ «همه»
 * بدونِ فیلتر.
 */
export const UNIT_SEGMENTS = Object.freeze({
  ALL: "all",
  IN_STOCK: "in-stock",
  QUARANTINE: "quarantine",
  WITH_CUSTOMER: "with-customer",
  RETURNED: "returned",
  SCRAPPED: "scrapped",
});

export const UNIT_SEGMENT_META = Object.freeze({
  [UNIT_SEGMENTS.ALL]: { label: "همه", status: null },
  [UNIT_SEGMENTS.IN_STOCK]: { label: "در انبار", status: UNIT_STATUSES.IN_STOCK },
  [UNIT_SEGMENTS.QUARANTINE]: { label: "قرنطینه", status: UNIT_STATUSES.QUARANTINED },
  [UNIT_SEGMENTS.WITH_CUSTOMER]: { label: "نزد مشتری", status: UNIT_STATUSES.SOLD },
  [UNIT_SEGMENTS.RETURNED]: {
    label: "عودت به تامین‌کننده",
    status: UNIT_STATUSES.RETURNED_TO_SUPPLIER,
  },
  [UNIT_SEGMENTS.SCRAPPED]: { label: "اسقاط", status: UNIT_STATUSES.SCRAPPED },
});

/** پیوندهای قدیمی (`?view=unlabeled` / `?view=quarantine`) هنوز کار می‌کنند. */
export function segmentFromLegacyView(view) {
  if (view === "quarantine") return { segment: UNIT_SEGMENTS.QUARANTINE };
  if (view === "unlabeled") return { segment: UNIT_SEGMENTS.ALL, labelFilter: "unprinted" };
  return {};
}

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
  // بکندِ فعلی `custodyReason` را نمی‌دهد و تنها قرنطینه‌ای که امروز دارد
  // قرنطینه‌ی دریافتِ خرید است؛ علتِ نامعلوم همان حساب می‌شود.
  (unit.custodyReason == null || PURCHASE_CUSTODY_REASONS.includes(unit.custodyReason));

/**
 * کارهایی که روی این دانه مجازند (بند ۴). هر قرنطینه‌ای — دستی، برگشتی از
 * مشتری یا دریافتِ خرید — هر سه راه را دارد: بازگشت به موجودی، اسقاط، یا
 * عودت به تامین‌کننده (`purchaseReturnRouteOf`). برای قرنطینه‌ی خرید سرور
 * حسابِ باز با تامین‌کننده را هم می‌بندد (تصمیمِ محصول ۲۰۲۶-۰۹-۲۶).
 */
export function allowedActionsOf(unit) {
  if (unit.status === UNIT_STATUSES.IN_STOCK) {
    return [UnitActionEnum.QUARANTINE, UnitActionEnum.SCRAP];
  }
  if (unit.status === UNIT_STATUSES.QUARANTINED) {
    return [UnitActionEnum.RELEASE, UnitActionEnum.SCRAP];
  }
  return [];
}

export const canApply = (unit, action) => allowedActionsOf(unit).includes(action);

/**
 * عودت به تامین‌کننده از مرجوعیِ خریدی که دانه با آن آمده. قرنطینه‌ی دریافت
 * با پیش‌پرشدن از گزارشِ انبار. دانه‌ی بدونِ خرید (موجودیِ اولیه) تامین‌کننده‌ای
 * ندارد که به او برگردد.
 */
export function purchaseReturnRouteOf(unit) {
  if (unit.status !== UNIT_STATUSES.QUARANTINED || !unit.purchaseId) return null;
  const base = `${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=${unit.purchaseId}`;
  return isPurchaseQuarantine(unit) ? `${base}&prefill=quarantine` : base;
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
        place: "قرنطینه",
        detail: UNIT_CUSTODY_REASON_LABELS[unit.custodyReason] ?? "دریافت خرید",
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

// ─── فیلترِ مؤثر ───────────────────────────────────────────────────────────

/** فیلترِ «وضعیت برچسب». */
export const LABEL_FILTERS = Object.freeze({ UNPRINTED: "unprinted", PRINTED: "printed" });

export const LABEL_FILTER_OPTIONS = Object.freeze([
  { value: LABEL_FILTERS.UNPRINTED, label: "برچسب نخورده" },
  { value: LABEL_FILTERS.PRINTED, label: "برچسب خورده" },
]);

/**
 * جایگاهی که برچسب برایش معنا دارد: دانه‌ای که هنوز در انبار است (قفسه یا
 * قرنطینه). فروخته، عودت‌شده یا اسقاط‌شده دیگر برچسب لازم ندارد.
 */
export const segmentNeedsLabels = (segment) => {
  const status = UNIT_SEGMENT_META[segment]?.status;
  return !status || LABELABLE_STATUSES.includes(status);
};

/**
 * فیلترِ فرم → آنچه به `GetProductUnitList` می‌رود.
 * - جایگاه وضعیت را ثابت می‌کند؛ علتِ قرنطینه فقط در جایگاهِ قرنطینه.
 * - «برچسب نخورده» صفِ چاپ است: فقط دانه‌های هنوز در انبار — در جایگاهِ
 *   انتخاب‌شده، یا اگر «همه» است، قفسه و قرنطینه با هم.
 */
export function effectiveUnitFilters(filters) {
  const { segment, labelFilter, ...rest } = filters;
  const status = UNIT_SEGMENT_META[segment]?.status ?? "";
  const custodyReason = segment === UNIT_SEGMENTS.QUARANTINE ? rest.custodyReason : "";

  if (labelFilter === LABEL_FILTERS.UNPRINTED && segmentNeedsLabels(segment)) {
    return {
      ...rest,
      custodyReason,
      status: "",
      statuses: status ? [status] : LABELABLE_STATUSES,
      labelState: UnitLabelStateEnum.UNPRINTED,
    };
  }

  return {
    ...rest,
    custodyReason,
    status,
    statuses: [],
    labelState: labelFilter === LABEL_FILTERS.PRINTED ? UnitLabelStateEnum.PRINTED : "",
  };
}
