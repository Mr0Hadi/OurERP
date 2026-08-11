import { allPurchases } from "@/features/purchases/orders/services/mockData";
import {
  PURCHASE_ISSUE_TYPES,
  PURCHASE_ISSUE_TYPE_LABELS,
} from "@/shared/constants/purchaseIssueTypes";

export const PURCHASE_RETURN_REASONS = {
  ...PURCHASE_ISSUE_TYPES,
  EXCESS: "excess",
};

export const PURCHASE_RETURN_REASON_LABELS = {
  ...PURCHASE_ISSUE_TYPE_LABELS,
  [PURCHASE_RETURN_REASONS.EXCESS]: "ارسال اضافه",
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

// نوع تصمیمی که برای بخشی از یک قلم گرفته می‌شود
export const RESOLUTION_TYPES = {
  REFUND: "refund",
  REPLACEMENT: "replacement",
  CREDIT: "credit",
  WRITE_OFF: "write_off",
};

export const RESOLUTION_TYPE_LABELS = {
  [RESOLUTION_TYPES.REFUND]: "بازگشت وجه نقدی",
  [RESOLUTION_TYPES.REPLACEMENT]: "ارسال کالای جایگزین",
  [RESOLUTION_TYPES.CREDIT]: "اعتبار در خرید بعدی",
  [RESOLUTION_TYPES.WRITE_OFF]: "پذیرش زیان (بدون بازگشت وجه)",
};

// وضعیت هر خط تصمیم. فقط برای replacement واقعاً «در انتظار» می‌ماند؛
// بقیه‌ی انواع (پولی/زیان/اعتبار) همان لحظه‌ی ثبت، نهایی محسوب می‌شوند.
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
const REASONS_LIST = Object.values(PURCHASE_RETURN_REASONS);
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