import { allPurchases } from "@/features/purchases/orders/services/mockData";
import {
  PURCHASE_ISSUE_TYPES,
  PURCHASE_ISSUE_TYPE_LABELS,
  PURCHASE_ISSUE_TYPE_STYLES,
  SURPLUS_KINDS,
  SURPLUS_KIND_LABELS,
  SURPLUS_KIND_STYLES,
} from "@/shared/constants/purchaseIssueTypes";

// دلیل هر ادعا به دو خانواده تقسیم می‌شود، متناظر با دو نوع ادعا
// (claimKind): کسری روی سفارش، و مازادِ بیرون از سفارش. برای یک ادعای
// مازاد، دلیل همان «نوع مازاد» است — یعنی یک واژگان، نه دوتا.
export const SHORTAGE_RETURN_REASONS = { ...PURCHASE_ISSUE_TYPES };
export const SURPLUS_RETURN_REASONS = { ...SURPLUS_KINDS };

export const SHORTAGE_RETURN_REASON_LABELS = { ...PURCHASE_ISSUE_TYPE_LABELS };
export const SURPLUS_RETURN_REASON_LABELS = { ...SURPLUS_KIND_LABELS };

// نقشه‌ی کامل، فقط برای *نمایش* (جدول، فیلتر، بج‌ها) — هر جا که قرار
// است کاربر یک دلیل را *انتخاب* کند باید از زیرمجموعه‌ی متناسب با
// claimKind استفاده شود، نه از این نقشه.
export const PURCHASE_RETURN_REASONS = {
  ...SHORTAGE_RETURN_REASONS,
  ...SURPLUS_RETURN_REASONS,
};

export const PURCHASE_RETURN_REASON_LABELS = {
  ...SHORTAGE_RETURN_REASON_LABELS,
  ...SURPLUS_RETURN_REASON_LABELS,
};

export const PURCHASE_RETURN_REASON_STYLES = {
  ...PURCHASE_ISSUE_TYPE_STYLES,
  ...SURPLUS_KIND_STYLES,
};

// وضعیت کلی مرجوعی از روی خطوط تصمیمِ اقلامش محاسبه می‌شود، نه دستی
// انتخاب می‌شود (به‌جز رد/لغو که اکشن‌های صریح‌اند):
// pending      → هنوز هیچ تصمیمی برای هیچ قلمی ثبت نشده
// coordinating → برخی/همه‌ی تصمیم‌ها ثبت شده ولی حداقل یکی هنوز نهایی نشده
//                (مثلاً یک خط «جایگزینی» منتظر تأیید انبار است)
// resolved     → کل مقدار هر قلم تخصیص یافته و همه‌ی خطوط نهایی شده‌اند
// rejected     → تامین‌کننده در همان ابتدا کلاً رد کرده
// cancelled    → واحد خرید در همان ابتدا لغو کرده
export const PURCHASE_RETURN_STATUSES = {
  TRACKABLE: "trackable",
  PENDING: "pending",
  COORDINATING: "coordinating",
  RESOLVED: "resolved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

export const PURCHASE_RETURN_STATUS_LABELS = {
  [PURCHASE_RETURN_STATUSES.TRACKABLE]: "قابل پیگیری",
  [PURCHASE_RETURN_STATUSES.PENDING]: "در انتظار بررسی",
  [PURCHASE_RETURN_STATUSES.COORDINATING]: "در حال هماهنگی با تامین‌کننده",
  [PURCHASE_RETURN_STATUSES.RESOLVED]: "تسویه شده",
  [PURCHASE_RETURN_STATUSES.REJECTED]: "رد شده توسط تامین‌کننده",
  [PURCHASE_RETURN_STATUSES.CANCELLED]: "لغو شده",
};

/**
 * نوع تصمیمی که برای بخشی از یک قلم گرفته می‌شود.
 *
 * دو خانواده‌ی کاملاً مجزا که هرگز با هم مخلوط نمی‌شوند — کدام‌یک به
 * کاربر پیشنهاد شود را claimKind همان قلم تعیین می‌کند (نگاه کنید به
 * domain/purchaseReturnRules.js):
 *
 * • کسری  — کالایی که نرسید یا سالم تحویل داده نشد. پول برمی‌گردد یا
 *           کالا دوباره فرستاده می‌شود یا زیانش را خودمان می‌پذیریم.
 * • مازاد — کالایی که فیزیکاً پیش ماست ولی سفارش توجیهش نمی‌کند. یا
 *           پسش می‌فرستیم، یا نگه می‌داریم و پولش را می‌دهیم، یا نگه
 *           می‌داریم و تامین‌کننده هزینه‌اش را می‌پذیرد.
 *
 * توجه: WRITE_OFF یعنی *ما* زیان را می‌پذیریم (کسری‌ای که هیچ‌وقت جبران
 * نمی‌شود) و SUPPLIER_WRITE_OFF قرینه‌ی آن است — *تامین‌کننده* هزینه‌ی
 * کالایی را که ما نگه می‌داریم می‌پذیرد.
 */
export const RESOLUTION_TYPES = {
  // کسری
  REFUND: "refund",
  REPLACEMENT: "replacement",
  CREDIT: "credit",
  WRITE_OFF: "write_off",
  // مازاد
  RETURN_TO_SUPPLIER: "return_to_supplier",
  KEEP_AND_SETTLE: "keep_and_settle",
  SUPPLIER_WRITE_OFF: "supplier_write_off",
};

export const RESOLUTION_TYPE_LABELS = {
  [RESOLUTION_TYPES.REFUND]: "بازگشت وجه نقدی",
  [RESOLUTION_TYPES.REPLACEMENT]: "ارسال کالای جایگزین",
  [RESOLUTION_TYPES.CREDIT]: "اعتبار در خرید بعدی",
  [RESOLUTION_TYPES.WRITE_OFF]: "پذیرش زیان (بدون بازگشت وجه)",
  [RESOLUTION_TYPES.RETURN_TO_SUPPLIER]: "عودت کالا به تامین‌کننده",
  [RESOLUTION_TYPES.KEEP_AND_SETTLE]: "نگهداری کالا و تسویه مالی",
  [RESOLUTION_TYPES.SUPPLIER_WRITE_OFF]:
    "نگهداری بدون پرداخت (به عهده تامین‌کننده)",
};

export const SHORTAGE_RESOLUTION_TYPES = [
  RESOLUTION_TYPES.REFUND,
  RESOLUTION_TYPES.REPLACEMENT,
  RESOLUTION_TYPES.CREDIT,
  RESOLUTION_TYPES.WRITE_OFF,
];

export const SURPLUS_RESOLUTION_TYPES = [
  RESOLUTION_TYPES.RETURN_TO_SUPPLIER,
  RESOLUTION_TYPES.KEEP_AND_SETTLE,
  RESOLUTION_TYPES.SUPPLIER_WRITE_OFF,
];

// انواعی که مبلغ همراه دارند و در فرم ثبت تصمیم، فیلد مبلغ را نشان
// می‌دهند. REFUND پولی است که از تامین‌کننده پس می‌گیریم و
// KEEP_AND_SETTLE پولی که بابت کالای مازادِ نگه‌داشته‌شده می‌پردازیم؛
// جهت‌شان مخالف است ولی هر دو یک مبلغ دارند.
export const AMOUNT_BEARING_RESOLUTION_TYPES = [
  RESOLUTION_TYPES.REFUND,
  RESOLUTION_TYPES.KEEP_AND_SETTLE,
];

// انواعی که تا وقتی انبار کاری فیزیکی انجام ندهد «در انتظار» می‌مانند:
// REPLACEMENT منتظر *رسیدن* کالای جایگزین است و RETURN_TO_SUPPLIER
// منتظر *خارج‌شدن* کالای مازاد از انبار. بقیه‌ی انواع (پولی/زیان/
// اعتبار) همان لحظه‌ی ثبت، نهایی محسوب می‌شوند.
export const WAREHOUSE_PENDING_RESOLUTION_TYPES = [
  RESOLUTION_TYPES.REPLACEMENT,
  RESOLUTION_TYPES.RETURN_TO_SUPPLIER,
];

export const RESOLUTION_LINE_STATUSES = {
  AWAITING: "awaiting",
  RESOLVED: "resolved",
};

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

const SEED_ELIGIBLE_STATUSES = ["partially_received", "received"];
// این seedها همگی از روی کسریِ خرید ساخته می‌شوند، پس دلیلشان هم فقط
// می‌تواند از خانواده‌ی کسری باشد؛ یک ردیفِ کسری با دلیل «ارسال اضافه»
// داده‌ی بی‌معنایی است.
const REASONS_LIST = Object.values(SHORTAGE_RETURN_REASONS);
const seedEligiblePurchases = allPurchases.filter((p) =>
  SEED_ELIGIBLE_STATUSES.includes(p.status),
);

// وضعیت‌های واقعی (قابل seed) — trackable خودش به‌صورت مجازی تولید می‌شود
const SEED_STATUSES = [
  PURCHASE_RETURN_STATUSES.PENDING,
  PURCHASE_RETURN_STATUSES.COORDINATING,
  PURCHASE_RETURN_STATUSES.RESOLVED,
  PURCHASE_RETURN_STATUSES.REJECTED,
  PURCHASE_RETURN_STATUSES.CANCELLED,
];

function buildSeedResolutions(qty, unitPrice, seedStatus) {
  // فقط برای coordinating/resolved چند خط تصمیم نمونه می‌سازیم تا
  // نمونه‌ی واقع‌بینانه‌ای از «تسویه‌ی ترکیبی» در دیتای اولیه دیده شود
  if (seedStatus === PURCHASE_RETURN_STATUSES.RESOLVED) {
    // کل مقدار را بین ۱ یا ۲ خط، فقط با انواع فوری (بدون replacement)
    // تقسیم می‌کنیم تا نیازی به دریافت انبار برای «نهایی‌شدن» seed نباشد
    if (qty === 1 || Math.random() < 0.5) {
      return [
        {
          id: generateId(),
          type: pickRandom([
            RESOLUTION_TYPES.REFUND,
            RESOLUTION_TYPES.WRITE_OFF,
            RESOLUTION_TYPES.CREDIT,
          ]),
          qty,
          refundAmount: qty * unitPrice,
          note: "",
          status: RESOLUTION_LINE_STATUSES.RESOLVED,
          createdAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
        },
      ];
    }
    const firstQty = Math.max(1, Math.floor(qty / 2));
    const secondQty = qty - firstQty;
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
        type: RESOLUTION_TYPES.WRITE_OFF,
        qty: secondQty,
        refundAmount: 0,
        note: "",
        status: RESOLUTION_LINE_STATUSES.RESOLVED,
        createdAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
      },
    ];
  }

  if (seedStatus === PURCHASE_RETURN_STATUSES.COORDINATING) {
    // بخشی تسویه‌شده، بخشی همچنان در انتظار جایگزینی از تامین‌کننده
    const settledQty = Math.max(0, Math.floor(qty / 2));
    const awaitingQty = qty - settledQty;
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
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      });
    }
    return lines;
  }

  return [];
}

function buildReturnFromPurchase(purchase, index) {
  const itemsCount = Math.min(purchase.items.length, randomInt(1, 2));
  const pickedItems = [...purchase.items]
    .sort(() => 0.5 - Math.random())
    .slice(0, itemsCount);

  const reason = pickRandom(REASONS_LIST);
  const status = pickRandom(SEED_STATUSES);

  const items = pickedItems.map((item) => {
    const qty = Math.max(1, Math.min(item.qty, randomInt(1, 4)));
    return {
      issueId: generateId(),
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      qty,
      unitPrice: item.unitPrice,
      lineTotal: qty * item.unitPrice,
      reason,
      note: "",
      resolutions: buildSeedResolutions(qty, item.unitPrice, status),
    };
  });

  const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const createdDate = new Date(purchase.createdAt);
  createdDate.setDate(createdDate.getDate() + randomInt(1, 10));

  return {
    id: index + 1,
    returnNumber: `RET-2026-${String(index + 1).padStart(3, "0")}`,
    purchaseId: purchase.id,
    purchaseInvoiceNumber: purchase.invoiceNumber,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    returnDate: formatDate(createdDate),
    reason,
    status,
    items,
    totalAmount,
    description: "",
    supplierResponseNote: "",
    createdAt: createdDate.toISOString(),
    updatedAt: createdDate.toISOString(),
  };
}

export const purchaseReturnsMock = seedEligiblePurchases
  .slice(0, 8)
  .map((purchase, idx) => buildReturnFromPurchase(purchase, idx));

export const allPurchaseReturns = [...purchaseReturnsMock];