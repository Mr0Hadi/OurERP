// src/features/sales/services/returns/mockData.js
import { allSales } from "@/features/sales/orders/services/mockData";

// ─── دلیلی که مشتری هنگام ثبت درخواست مرجوعی اعلام می‌کند ──────────────────
export const SALES_RETURN_REASONS = {
  DEFECTIVE: "defective",
  WRONG_ITEM: "wrong_item",
  DAMAGED_IN_TRANSIT: "damaged_in_transit",
  CHANGED_MIND: "changed_mind",
  QUALITY_ISSUE: "quality_issue",
  EXCESS_ORDER: "excess_order",
  OTHER: "other",
};

export const SALES_RETURN_REASON_LABELS = {
  [SALES_RETURN_REASONS.DEFECTIVE]: "کالای معیوب/خراب",
  [SALES_RETURN_REASONS.WRONG_ITEM]: "ارسال کالای اشتباه",
  [SALES_RETURN_REASONS.DAMAGED_IN_TRANSIT]: "آسیب‌دیده در حمل و نقل",
  [SALES_RETURN_REASONS.CHANGED_MIND]: "انصراف مشتری",
  [SALES_RETURN_REASONS.QUALITY_ISSUE]: "عدم تطابق کیفیت/مشخصات",
  [SALES_RETURN_REASONS.EXCESS_ORDER]: "اضافه سفارش داده‌شده",
  [SALES_RETURN_REASONS.OTHER]: "سایر موارد",
};

// ─── نوع مشکلی که انباردار، هنگام بررسی فیزیکیِ بخشی از کالای واقعاً
// رسیده، برایش ثبت می‌کند (بخش «بررسی و دریافت مرجوعی» در انبار). ─────────
// این جدا از «دلیل ادعای مشتری» است — همان‌طور که یک محموله می‌تواند هم
// «آسیب‌دیده در حمل» و هم «ارسال اشتباه» داشته باشد، اینجا هم هر بخش از
// تعدادِ رسیده می‌تواند نوع مشکل خودش را داشته باشد (مثلاً از ۷ عدد
// رسیده: ۴ عدد آسیب‌دیده در حمل و ۳ عدد ارسال اشتباه).
// «سالم» به‌صورت ضمنی محاسبه می‌شود (باقیمانده‌ی رسیده که مشکلی برایش
// گزارش نشده) و «هنوز نرسیده» هم از تفاضل claimedQty−verifiedQty به دست
// می‌آید — پس نیازی به گزینه‌ی جداگانه برای این دو در این لیست نیست.
export const RETURN_ISSUE_TYPES = {
  DEFECTIVE: "defective",
  WRONG_ITEM: "wrong_item",
  DAMAGED_IN_TRANSIT: "damaged_in_transit",
  QUALITY_ISSUE: "quality_issue",
  OTHER: "other",
};

export const RETURN_ISSUE_TYPE_LABELS = {
  [RETURN_ISSUE_TYPES.DEFECTIVE]: "معیوب/خراب",
  [RETURN_ISSUE_TYPES.WRONG_ITEM]: "ارسال اشتباه",
  [RETURN_ISSUE_TYPES.DAMAGED_IN_TRANSIT]: "آسیب‌دیده در حمل",
  [RETURN_ISSUE_TYPES.QUALITY_ISSUE]: "مغایرت کیفیت/مشخصات",
  [RETURN_ISSUE_TYPES.OTHER]: "سایر",
};

export const RETURN_ISSUE_TYPE_STYLES = {
  [RETURN_ISSUE_TYPES.DEFECTIVE]:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400",
  [RETURN_ISSUE_TYPES.WRONG_ITEM]:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400",
  [RETURN_ISSUE_TYPES.DAMAGED_IN_TRANSIT]:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  [RETURN_ISSUE_TYPES.QUALITY_ISSUE]:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-400",
  [RETURN_ISSUE_TYPES.OTHER]: "bg-muted text-muted-foreground border-border",
};

// ─── وضعیت کلی مرجوعی ────────────────────────────────────────────────────────
// pending_inspection → هنوز در «انبار → دریافت کالا» بررسی فیزیکی نشده
// coordinating        → بررسی انجام شده؛ تصمیم برای برخی/همه‌ی اقلام باقی مانده
// resolved             → کل مقدارِ واقعاً رسیده تخصیص یافته و نهایی شده
// rejected             → ادعای مشتری همان ابتدا (پیش از بررسی) رد شده
// cancelled            → درخواست پیش از بررسی لغو شده
export const SALES_RETURN_STATUSES = {
  PENDING_INSPECTION: "pending_inspection",
  COORDINATING: "coordinating",
  RESOLVED: "resolved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

export const SALES_RETURN_STATUS_LABELS = {
  [SALES_RETURN_STATUSES.PENDING_INSPECTION]: "در انتظار بررسی انبار",
  [SALES_RETURN_STATUSES.COORDINATING]: "در حال تصمیم‌گیری",
  [SALES_RETURN_STATUSES.RESOLVED]: "تسویه شده",
  [SALES_RETURN_STATUSES.REJECTED]: "رد شده",
  [SALES_RETURN_STATUSES.CANCELLED]: "لغو شده",
};

// ─── نوع تصمیمی که برای بخشی از یک قلم (پس از بررسی انبار) گرفته می‌شود ─────
export const RESOLUTION_TYPES = {
  REFUND: "refund",
  REPLACEMENT: "replacement",
  STORE_CREDIT: "store_credit",
  NO_COMPENSATION: "no_compensation",
};

export const RESOLUTION_TYPE_LABELS = {
  [RESOLUTION_TYPES.REFUND]: "بازگشت وجه نقدی به مشتری",
  [RESOLUTION_TYPES.REPLACEMENT]: "ارسال کالای جایگزین",
  [RESOLUTION_TYPES.STORE_CREDIT]: "اعتبار در خرید بعدی",
  [RESOLUTION_TYPES.NO_COMPENSATION]: "بدون جبران (رد این بخش از ادعا)",
};

export const RESOLUTION_LINE_STATUSES = {
  AWAITING: "awaiting",
  RESOLVED: "resolved",
};

// ─── تولید داده‌ی نمونه ──────────────────────────────────────────────────────
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom(arr) {
  return arr[randomInt(0, arr.length - 1)];
}
function formatDate(d) {
  return d.toISOString().slice(0, 10);
}
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// مرجوعی فقط برای فروش‌هایی معنا دارد که واقعاً چیزی از انبار برایشان
// خارج شده باشد — چه به‌طور کامل («ارسال شده» / «تحویل کامل») چه ناقص.
const SEED_ELIGIBLE_STATUSES = ["shipped", "delivered", "partially_delivered"];
const REASONS_LIST = Object.values(SALES_RETURN_REASONS);
const ISSUE_TYPES_LIST = Object.values(RETURN_ISSUE_TYPES);

const seedEligibleSales = allSales.filter((s) =>
  SEED_ELIGIBLE_STATUSES.includes(s.status),
);

const SEED_STATUSES = [
  SALES_RETURN_STATUSES.PENDING_INSPECTION,
  SALES_RETURN_STATUSES.COORDINATING,
  SALES_RETURN_STATUSES.RESOLVED,
  SALES_RETURN_STATUSES.REJECTED,
  SALES_RETURN_STATUSES.CANCELLED,
];

function buildSeedIssues(verifiedQty) {
  // گاهی همه‌ی رسیده سالم است (بدون issue)، گاهی یک نوع مشکل دارد،
  // گاهی هم بین دو نوع مشکل مختلف تقسیم شده — دقیقاً طبق چیزی که
  // کاربر خواسته (مثال ۴+۳).
  if (verifiedQty <= 0 || Math.random() < 0.35) return [];

  if (verifiedQty === 1 || Math.random() < 0.55) {
    const qty = Math.max(1, Math.floor(verifiedQty * (0.4 + Math.random() * 0.6)));
    return [
      {
        id: generateId(),
        issueType: pickRandom(ISSUE_TYPES_LIST),
        qty: Math.min(qty, verifiedQty),
        note: "",
      },
    ];
  }

  const firstQty = Math.max(1, Math.floor(verifiedQty / 2));
  const secondQty = Math.max(0, verifiedQty - firstQty - 1); // یک واحد سالم باقی می‌ماند
  const types = [...ISSUE_TYPES_LIST].sort(() => 0.5 - Math.random());
  const issues = [{ id: generateId(), issueType: types[0], qty: firstQty, note: "" }];
  if (secondQty > 0) {
    issues.push({ id: generateId(), issueType: types[1], qty: secondQty, note: "" });
  }
  return issues;
}

function buildSeedResolutions(resolvableQty, unitPrice, seedStatus) {
  if (seedStatus === SALES_RETURN_STATUSES.RESOLVED) {
    if (resolvableQty === 1 || Math.random() < 0.5) {
      return [
        {
          id: generateId(),
          type: pickRandom([
            RESOLUTION_TYPES.REFUND,
            RESOLUTION_TYPES.STORE_CREDIT,
            RESOLUTION_TYPES.NO_COMPENSATION,
          ]),
          qty: resolvableQty,
          refundAmount: resolvableQty * unitPrice,
          note: "",
          status: RESOLUTION_LINE_STATUSES.RESOLVED,
          createdAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
        },
      ];
    }
    const firstQty = Math.max(1, Math.floor(resolvableQty / 2));
    const secondQty = resolvableQty - firstQty;
    return [
      {
        id: generateId(),
        type: RESOLUTION_TYPES.REFUND,
        qty: firstQty,
        refundAmount: firstQty * unitPrice,
        note: "",
        status: RESOLUTION_LINE_STATUSES.RESOLVED,
        createdAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        type: RESOLUTION_TYPES.NO_COMPENSATION,
        qty: secondQty,
        refundAmount: 0,
        note: "",
        status: RESOLUTION_LINE_STATUSES.RESOLVED,
        createdAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
      },
    ];
  }

  if (seedStatus === SALES_RETURN_STATUSES.COORDINATING) {
    const settledQty = Math.max(0, Math.floor(resolvableQty / 2));
    const awaitingQty = resolvableQty - settledQty;
    const lines = [];
    if (settledQty > 0) {
      lines.push({
        id: generateId(),
        type: RESOLUTION_TYPES.REFUND,
        qty: settledQty,
        refundAmount: settledQty * unitPrice,
        note: "",
        status: RESOLUTION_LINE_STATUSES.RESOLVED,
        createdAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
      });
    }
    if (awaitingQty > 0) {
      lines.push({
        id: generateId(),
        type: RESOLUTION_TYPES.REPLACEMENT,
        qty: awaitingQty,
        refundAmount: 0,
        note: "",
        status: RESOLUTION_LINE_STATUSES.AWAITING,
        shippedQty: 0,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      });
    }
    return lines;
  }

  return [];
}

function buildSeedClaims(claimedQty, reason) {
  if (claimedQty <= 1 || Math.random() < 0.5) {
    return [{ id: generateId(), reason, qty: claimedQty, note: "" }];
  }
  const firstQty = Math.max(1, Math.floor(claimedQty / 2));
  const secondQty = claimedQty - firstQty;
  const otherReason = pickRandom(REASONS_LIST.filter((r) => r !== reason)) || reason;
  return [
    { id: generateId(), reason, qty: firstQty, note: "" },
    { id: generateId(), reason: otherReason, qty: secondQty, note: "" },
  ];
}

function buildReturnFromSale(sale, index) {
  const itemsCount = Math.min(sale.items.length, randomInt(1, 2));
  const pickedItems = [...sale.items].sort(() => 0.5 - Math.random()).slice(0, itemsCount);

  const reason = pickRandom(REASONS_LIST);
  const status = pickRandom(SEED_STATUSES);
  const isInspected = status !== SALES_RETURN_STATUSES.PENDING_INSPECTION;

const items = pickedItems.map((item) => {
    const availableQty = item.shippedQty ?? item.qty;
    const claimedQty = Math.max(1, Math.min(availableQty, randomInt(1, 4)));
    const claims = buildSeedClaims(claimedQty, reason);

    let verifiedQty = 0;
    let issues = [];
    if (isInspected) {
      verifiedQty = randomInt(Math.ceil(claimedQty * 0.6), claimedQty);
      issues = buildSeedIssues(verifiedQty);
    }

    return {
      lineId: generateId(),
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      claims,
      claimedQty,
      unitPrice: item.unitPrice,
      lineTotal: claimedQty * item.unitPrice,
      verifiedQty,
      issues,
      resolutions:
        isInspected && verifiedQty > 0
          ? buildSeedResolutions(verifiedQty, item.unitPrice, status)
          : [],
    };
  });

  const totalClaimedAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const createdDate = new Date(sale.createdAt);
  createdDate.setDate(createdDate.getDate() + randomInt(3, 20));

  const receivedDate = new Date(createdDate);
  receivedDate.setDate(receivedDate.getDate() + randomInt(1, 4));

  return {
    id: index + 1,
    returnNumber: `SRET-2026-${String(index + 1).padStart(3, "0")}`,
    saleId: sale.id,
    saleInvoiceNumber: sale.invoiceNumber,
    customerId: sale.customerId,
    customerName: sale.customerName,
    returnDate: formatDate(createdDate),
    reason,
    status,
    items,
    totalClaimedAmount,
    description: "",
    // اطلاعاتِ خودِ رویداد «بررسی و دریافت» — دقیقاً مثل دریافت خرید،
    // فقط اینجا از صفحه‌ی «انبار → دریافت کالا → مرجوعی‌ها» ثبت می‌شود.
    receivingNote: isInspected ? "" : "",
    receivedDate: isInspected ? formatDate(receivedDate) : "",
    transporterName: isInspected ? "پیک ارسالی مشتری" : "",
    transporterNationalId: "",
    vehiclePlate: "",
    createdAt: createdDate.toISOString(),
    updatedAt: createdDate.toISOString(),
  };
}

export const salesReturnsMock = seedEligibleSales
  .slice(0, 8)
  .map((sale, idx) => buildReturnFromSale(sale, idx));

export const allSalesReturns = [...salesReturnsMock];
