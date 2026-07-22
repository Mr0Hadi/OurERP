// src/features/sales/services/mockData.js

export const SALE_STATUSES = {
  PENDING: "pending",
  PROCESSING: "processing",
  PARTIALLY_DELIVERED: "partially_delivered",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const SALE_STATUS_LABELS = {
  [SALE_STATUSES.PENDING]: "در انتظار",
  [SALE_STATUSES.PROCESSING]: "در حال پردازش",
  [SALE_STATUSES.PARTIALLY_DELIVERED]: "تحویل ناقص",
  [SALE_STATUSES.DELIVERED]: "تحویل کامل",
  [SALE_STATUSES.CANCELLED]: "لغو شده",
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

// ─── داده‌های نمونه فروش (همه IDها عددی) ────────────────────────────────────

export const salesMock = [
  {
    id: 1,
    customerId: 1,
    customerName: "علی محمدی",
    invoiceNumber: "SALE-2026-001",
    invoiceDate: "2026-06-04",
    status: SALE_STATUSES.DELIVERED,
    paymentType: PAYMENT_TYPES.CASH,
    paidAmount: 45000000,
    totalAmount: 45000000,
    description: "فروش لوازم یدکی موتور",
    items: [
      {
        productId: 1,
        productCode: "BRK-001",
        productName: "لنت ترمز جلو",
        unit: "دست",
        qty: 10,
        unitPrice: 2000000,
        discount: 0,
        lineTotal: 20000000,
      },
      {
        productId: 2,
        productCode: "FLT-002",
        productName: "فیلتر روغن",
        unit: "عدد",
        qty: 50,
        unitPrice: 500000,
        discount: 0,
        lineTotal: 25000000,
      },
    ],
    createdAt: "2026-06-04T10:30:00.000Z",
    updatedAt: "2026-06-04T10:30:00.000Z",
  },
  {
    id: 2,
    customerId: 2,
    customerName: "فاطمه احمدی",
    invoiceNumber: "SALE-2026-002",
    invoiceDate: "2026-06-09",
    status: SALE_STATUSES.PROCESSING,
    paymentType: PAYMENT_TYPES.CREDIT,
    paidAmount: 0,
    totalAmount: 28550000,
    description: "فروش لنت و دیسک ترمز",
    items: [
      {
        productId: 1,
        productCode: "BRK-001",
        productName: "لنت ترمز جلو",
        unit: "دست",
        qty: 10,
        unitPrice: 1900000,
        discount: 5,
        lineTotal: 18050000,
      },
      {
        productId: 3,
        productCode: "SHK-003",
        productName: "کمک فنر جلو",
        unit: "عدد",
        qty: 3,
        unitPrice: 3500000,
        discount: 0,
        lineTotal: 10500000,
      },
    ],
    createdAt: "2026-06-09T14:15:00.000Z",
    updatedAt: "2026-06-09T14:15:00.000Z",
  },
  {
    id: 3,
    customerId: 3,
    customerName: "لیلا ابراهیمی",
    invoiceNumber: "SALE-2026-003",
    invoiceDate: "2026-06-15",
    status: SALE_STATUSES.DELIVERED,
    paymentType: PAYMENT_TYPES.MIXED,
    paidAmount: 34608000,
    totalAmount: 34608000,
    mixedPayments: [
      { id: 1, type: "cash", amount: 15000000 },
      { id: 2, type: "check", amount: 10000000, checkNumber: "1234567890" },
      { id: 3, type: "transfer", amount: 9608000, transferRef: "TRN-87654321" },
    ],
    description: "فروش باتری و لوازم برقی",
    items: [
      {
        productId: 5,
        productCode: "BAT-005",
        productName: "باتری ۶۰ آمپر",
        unit: "عدد",
        qty: 5,
        unitPrice: 6000000,
        discount: 0,
        lineTotal: 30000000,
      },
      {
        productId: 4,
        productCode: "LMP-004",
        productName: "لامپ هدلایت H4",
        unit: "عدد",
        qty: 12,
        unitPrice: 400000,
        discount: 4,
        lineTotal: 4608000,
      },
    ],
    createdAt: "2026-06-15T11:20:00.000Z",
    updatedAt: "2026-06-15T11:20:00.000Z",
  },
];

// ─── تولید فروش‌های بیشتر (همه IDها عددی) ────────────────────────────────────

const MOCK_CUSTOMERS = [
  { id: 1, name: "علی محمدی" },
  { id: 2, name: "فاطمه احمدی" },
  { id: 3, name: "لیلا ابراهیمی" },
];

const MOCK_PRODUCTS = [
  { id: 1, code: "BRK-001", name: "لنت ترمز جلو", price: 2000000, unit: "دست" },
  { id: 2, code: "FLT-002", name: "فیلتر روغن", price: 500000, unit: "عدد" },
  { id: 3, code: "SHK-003", name: "کمک فنر جلو", price: 3500000, unit: "عدد" },
  { id: 4, code: "LMP-004", name: "لامپ هدلایت H4", price: 400000, unit: "عدد" },
  { id: 5, code: "BAT-005", name: "باتری ۶۰ آمپر", price: 6000000, unit: "عدد" },
];

const MOCK_DESCRIPTIONS = [
  "فروش قطعات موتور",
  "فروش لوازم سیستم ترمز",
  "فروش لوازم سیستم تعلیق",
  "فروش لوازم برقی",
  "فروش فیلترها",
  "فروش عمده قطعات",
  "",
];

const SINGLE_PAYMENT_TYPES = ["cash", "check", "transfer"];

function buildRandomItems() {
  const itemsCount = randomInt(1, 4);
  const usedProductIds = new Set();
  const items = [];
  let totalAmount = 0;

  for (let j = 0; j < itemsCount; j++) {
    const availableProducts = MOCK_PRODUCTS.filter((p) => !usedProductIds.has(p.id));
    if (availableProducts.length === 0) break;

    const product = pickRandom(availableProducts);
    usedProductIds.add(product.id);

    const qty = randomInt(1, 20);
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

function generateMoreSales(count = 20) {
  const baseDate = new Date("2026-01-01");
  const sales = [];

  for (let i = 0; i < count; i++) {
    const customer = pickRandom(MOCK_CUSTOMERS);
    const status = pickRandom(Object.values(SALE_STATUSES));
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
    const saleDate = new Date(baseDate);
    saleDate.setDate(saleDate.getDate() + daysAgo);
    const invoiceDate = formatDate(
      saleDate.getFullYear(),
      saleDate.getMonth() + 1,
      saleDate.getDate()
    );

    const newId = salesMock.length + i + 1;

    const sale = {
      id: newId,
      customerId: customer.id,
      customerName: customer.name,
      invoiceNumber: `SALE-2026-${String(newId).padStart(3, "0")}`,
      invoiceDate,
      status,
      paymentType,
      paidAmount,
      totalAmount,
      description: pickRandom(MOCK_DESCRIPTIONS),
      items,
      createdAt: saleDate.toISOString(),
      updatedAt: saleDate.toISOString(),
    };

    if (paymentType === PAYMENT_TYPES.CHECK) {
      sale.checkNumber = String(randomInt(1000000000, 9999999999));
    } else if (paymentType === PAYMENT_TYPES.TRANSFER) {
      sale.transferRef = `TRN-${randomInt(10000000, 99999999)}`;
    } else if (paymentType === PAYMENT_TYPES.MIXED && mixedPayments) {
      sale.mixedPayments = mixedPayments;
    }

    sales.push(sale);
  }

  return sales;
}

// آرایه نهایی فروش‌ها
export const allSales = [...salesMock, ...generateMoreSales(20)];
