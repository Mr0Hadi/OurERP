// src/features/purchases/services/mockData.js

export const PURCHASE_STATUSES = {
  PENDING: "pending",
  SHIPPED: "shipped",
  PARTIALLY_RECEIVED: "partially_received",
  RECEIVED: "received",
  CANCELLED: "cancelled",
};

export const PURCHASE_STATUS_LABELS = {
  [PURCHASE_STATUSES.PENDING]: "در انتظار ارسال",
  [PURCHASE_STATUSES.SHIPPED]: "ارسال شده",
  [PURCHASE_STATUSES.PARTIALLY_RECEIVED]: "تحویل ناقص",
  [PURCHASE_STATUSES.RECEIVED]: "تحویل کامل",
  [PURCHASE_STATUSES.CANCELLED]: "لغو شده",
};

export const PAYMENT_TYPES = {
  CASH: "cash",
  CREDIT: "credit",
  CHECK: "check",
  TRANSFER: "transfer",
  MIXED: "mixed",
};

export const PAYMENT_TYPE_LABELS = {
  [PAYMENT_TYPES.CASH]: "نقدی",
  [PAYMENT_TYPES.CREDIT]: "نسیه",
  [PAYMENT_TYPES.CHECK]: "چک",
  [PAYMENT_TYPES.TRANSFER]: "انتقال بانکی",
  [PAYMENT_TYPES.MIXED]: "ترکیبی",
};

// ─── توابع کمکی ────────────────────────────────────────────────────────────

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(array) {
  return array[randomInt(0, array.length - 1)];
}

// ─── داده‌های نمونه خرید (همه IDها عددی) ────────────────────────────────────

export const purchasesMock = [
  {
    id: 1,
    supplierId: 1,
    supplierName: "ایران قطعه",
    invoiceNumber: "INV-2026-001",
    invoiceDate: "2026-03-15",
    status: PURCHASE_STATUSES.RECEIVED,
    paymentType: PAYMENT_TYPES.CASH,
    paidAmount: 45000000,
    totalAmount: 45000000,
    description: "خرید لوازم یدکی موتور",
    items: [
      {
        productId: 1,
        productCode: "BRK-001",
        productName: "لنت ترمز جلو",
        unit: "دست",
        qty: 20,
        unitPrice: 1500000,
        discount: 0,
        lineTotal: 30000000,
      },
      {
        productId: 2,
        productCode: "FLT-002",
        productName: "فیلتر روغن",
        unit: "عدد",
        qty: 50,
        unitPrice: 300000,
        discount: 0,
        lineTotal: 15000000,
      },
    ],
    createdAt: "2026-06-04T10:30:00.000Z",
    updatedAt: "2026-06-04T10:30:00.000Z",
  },
  {
    id: 2,
    supplierId: 2,
    supplierName: "لنت پارس موتور",
    invoiceNumber: "INV-2026-002",
    invoiceDate: "2026-03-20",
    status: PURCHASE_STATUSES.SHIPPED,
    paymentType: PAYMENT_TYPES.CREDIT,
    paidAmount: 0,
    totalAmount: 28500000,
    description: "خرید لنت و دیسک ترمز",
    items: [
      {
        productId: 1,
        productCode: "BRK-001",
        productName: "لنت ترمز جلو",
        unit: "دست",
        qty: 15,
        unitPrice: 1500000,
        discount: 5,
        lineTotal: 21375000,
      },
      {
        productId: 3,
        productCode: "SHK-003",
        productName: "کمک فنر جلو",
        unit: "عدد",
        qty: 4,
        unitPrice: 1800000,
        discount: 0,
        lineTotal: 7200000,
      },
    ],
    createdAt: "2026-06-09T14:15:00.000Z",
    updatedAt: "2026-06-09T14:15:00.000Z",
  },
  {
    id: 3,
    supplierId: 3,
    supplierName: "پخش بلبرینگ مرکزی",
    invoiceNumber: "INV-2026-003",
    invoiceDate: "2026-03-25",
    status: PURCHASE_STATUSES.PARTIALLY_RECEIVED,
    paymentType: PAYMENT_TYPES.CHECK,
    paidAmount: 50000000,
    totalAmount: 50000000,
    checkNumber: "7845612301",
    description: "خرید یاتاقان و بلبرینگ",
    items: [
      {
        productId: 6,
        productCode: "BRG-006",
        productName: "کاسه چرخ عقب",
        unit: "عدد",
        qty: 30,
        unitPrice: 800000,
        discount: 10,
        lineTotal: 21600000,
      },
      {
        productId: 9,
        productCode: "ENG-009",
        productName: "یاتاقان شاتون",
        unit: "عدد",
        qty: 20,
        unitPrice: 1420000,
        discount: 0,
        lineTotal: 28400000,
      },
    ],
    createdAt: "2026-06-14T09:45:00.000Z",
    updatedAt: "2026-06-14T09:45:00.000Z",
  },
  {
    id: 4,
    supplierId: 1,
    supplierName: "ایران قطعه",
    invoiceNumber: "INV-2026-004",
    invoiceDate: "2026-03-28",
    status: PURCHASE_STATUSES.PENDING,
    paymentType: PAYMENT_TYPES.TRANSFER,
    paidAmount: 35000000,
    totalAmount: 35000000,
    transferRef: "TRN-98765432",
    description: "خرید فیلترها و روغن موتور",
    items: [
      {
        productId: 2,
        productCode: "FLT-002",
        productName: "فیلتر روغن",
        unit: "عدد",
        qty: 60,
        unitPrice: 300000,
        discount: 0,
        lineTotal: 18000000,
      },
      {
        productId: 7,
        productCode: "FLT-007",
        productName: "فیلتر هوای موتور",
        unit: "عدد",
        qty: 40,
        unitPrice: 425000,
        discount: 0,
        lineTotal: 17000000,
      },
    ],
    createdAt: "2026-06-17T11:20:00.000Z",
    updatedAt: "2026-06-17T11:20:00.000Z",
  },
  {
    id: 5,
    supplierId: 2,
    supplierName: "لنت پارس موتور",
    invoiceNumber: "INV-2026-005",
    invoiceDate: "2026-04-01",
    status: PURCHASE_STATUSES.RECEIVED,
    paymentType: PAYMENT_TYPES.MIXED,
    paidAmount: 60000000,
    totalAmount: 82500000,
    mixedPayments: [
      { id: 1, type: "cash", amount: 30000000 },
      { id: 2, type: "check", amount: 20000000, checkNumber: "1234567890" },
      { id: 3, type: "transfer", amount: 10000000, transferRef: "TRN-55667788" },
    ],
    description: "خرید کلاچ و دیسک کلاچ - پرداخت ترکیبی",
    items: [
      {
        productId: 10,
        productCode: "CLT-010",
        productName: "کلاچ کامل",
        unit: "دست",
        qty: 15,
        unitPrice: 5500000,
        discount: 0,
        lineTotal: 82500000,
      },
    ],
    createdAt: "2026-06-20T16:00:00.000Z",
    updatedAt: "2026-06-20T16:00:00.000Z",
  },
  {
    id: 6,
    supplierId: 1,
    supplierName: "ایران قطعه",
    invoiceNumber: "INV-2026-006",
    invoiceDate: "2026-04-02",
    status: PURCHASE_STATUSES.CANCELLED,
    paymentType: PAYMENT_TYPES.CREDIT,
    paidAmount: 0,
    totalAmount: 24000000,
    description: "خرید لامپ - لغو شده به دلیل عدم موجودی",
    items: [
      {
        productId: 4,
        productCode: "LMP-004",
        productName: "لامپ هدلایت H4",
        unit: "عدد",
        qty: 100,
        unitPrice: 240000,
        discount: 0,
        lineTotal: 24000000,
      },
    ],
    createdAt: "2026-06-21T08:30:00.000Z",
    updatedAt: "2026-06-21T13:45:00.000Z",
  },
];

// ─── تولید خریدهای بیشتر (همه IDها عددی) ────────────────────────────────────

const MOCK_SUPPLIERS = [
  { id: 1, name: "ایران قطعه" },
  { id: 2, name: "لنت پارس موتور" },
  { id: 3, name: "پخش بلبرینگ مرکزی" },
];

const MOCK_PRODUCTS = [
  { id: 1, code: "BRK-001", name: "لنت ترمز جلو", price: 1500000, unit: "دست" },
  { id: 2, code: "FLT-002", name: "فیلتر روغن", price: 300000, unit: "عدد" },
  { id: 3, code: "SHK-003", name: "کمک فنر جلو", price: 1800000, unit: "عدد" },
  { id: 4, code: "LMP-004", name: "لامپ هدلایت H4", price: 240000, unit: "عدد" },
  { id: 5, code: "BAT-005", name: "باتری ۶۰ آمپر", price: 4500000, unit: "عدد" },
  { id: 6, code: "BRG-006", name: "کاسه چرخ عقب", price: 800000, unit: "عدد" },
  { id: 7, code: "FLT-007", name: "فیلتر هوای موتور", price: 425000, unit: "عدد" },
  { id: 8, code: "SHK-008", name: "کمک فنر عقب", price: 1850000, unit: "عدد" },
  { id: 9, code: "ENG-009", name: "یاتاقان شاتون", price: 1420000, unit: "عدد" },
  { id: 10, code: "CLT-010", name: "کلاچ کامل", price: 5500000, unit: "دست" },
];

const MOCK_DESCRIPTIONS = [
  "خرید قطعات موتور",
  "خرید لوازم سیستم ترمز",
  "خرید لوازم سیستم تعلیق",
  "خرید لوازم برقی",
  "خرید فیلترها",
  "خرید یاتاقان و بلبرینگ",
  "خرید لوازم گیربکس",
  "سفارش عمده قطعات",
  "خرید اورژانسی",
  "",
];

const SINGLE_PAYMENT_TYPES = ["cash", "check", "transfer"];

function buildRandomItems() {
  const itemsCount = randomInt(1, 5);
  const usedProductIds = new Set();
  const items = [];
  let totalAmount = 0;

  for (let j = 0; j < itemsCount; j++) {
    const availableProducts = MOCK_PRODUCTS.filter((p) => !usedProductIds.has(p.id));
    if (availableProducts.length === 0) break;

    const product = pickRandom(availableProducts);
    usedProductIds.add(product.id);

    const qty = randomInt(5, 34);
    const discount = Math.random() < 0.3 ? randomInt(1, 15) : 0;
    const lineTotal = qty * product.price * (1 - discount / 100);

    items.push({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      unit: product.unit,
      qty,
      unitPrice: product.price,
      discount,
      lineTotal,
    });

    totalAmount += lineTotal;
  }

  return { items, totalAmount };
}

function buildMixedPayments(totalAmount) {
  const numPayments = randomInt(2, 4);
  const mixedPayments = [];
  let remainingAmount = totalAmount;
  let paidAmount = 0;

  for (let k = 0; k < numPayments; k++) {
    const isLast = k === numPayments - 1;
    const paymentAmount = isLast
      ? remainingAmount
      : Math.floor(remainingAmount * (0.2 + Math.random() * 0.4));

    const type = pickRandom(SINGLE_PAYMENT_TYPES);
    const payment = { id: k + 1, type, amount: paymentAmount };

    if (type === "check") {
      payment.checkNumber = String(randomInt(1000000000, 9999999999));
    } else if (type === "transfer") {
      payment.transferRef = `TRN-${randomInt(10000000, 99999999)}`;
    }

    mixedPayments.push(payment);
    remainingAmount -= paymentAmount;
    paidAmount += paymentAmount;
  }

  return { mixedPayments, paidAmount };
}

function generateMorePurchases(count = 20) {
  const baseDate = new Date("2026-01-01");
  const purchases = [];

  for (let i = 0; i < count; i++) {
    const supplier = pickRandom(MOCK_SUPPLIERS);
    const status = pickRandom(Object.values(PURCHASE_STATUSES));
    const paymentType = pickRandom(Object.values(PAYMENT_TYPES));

    const { items, totalAmount } = buildRandomItems();

    let paidAmount = 0;
    let mixedPayments = null;

    if (paymentType === PAYMENT_TYPES.CREDIT) {
      paidAmount = 0;
    } else if (paymentType === PAYMENT_TYPES.MIXED) {
      const result = buildMixedPayments(totalAmount);
      mixedPayments = result.mixedPayments;
      paidAmount = result.paidAmount;
    } else {
      paidAmount = totalAmount;
    }

    const daysAgo = randomInt(0, 179);
    const purchaseDate = new Date(baseDate);
    purchaseDate.setDate(purchaseDate.getDate() + daysAgo);
    const invoiceDate = formatDate(
      purchaseDate.getFullYear(),
      purchaseDate.getMonth() + 1,
      purchaseDate.getDate()
    );

    const newId = purchasesMock.length + i + 1;

    const purchase = {
      id: newId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNumber: `INV-2026-${String(newId).padStart(3, "0")}`,
      invoiceDate,
      status,
      paymentType,
      paidAmount,
      totalAmount,
      description: pickRandom(MOCK_DESCRIPTIONS),
      items,
      createdAt: purchaseDate.toISOString(),
      updatedAt: purchaseDate.toISOString(),
    };

    if (paymentType === PAYMENT_TYPES.CHECK) {
      purchase.checkNumber = String(randomInt(1000000000, 9999999999));
    } else if (paymentType === PAYMENT_TYPES.TRANSFER) {
      purchase.transferRef = `TRN-${randomInt(10000000, 99999999)}`;
    } else if (paymentType === PAYMENT_TYPES.MIXED && mixedPayments) {
      purchase.mixedPayments = mixedPayments;
    }

    purchases.push(purchase);
  }

  return purchases;
}

// آرایه نهایی خریدها
export const allPurchases = [...purchasesMock, ...generateMorePurchases(20)];