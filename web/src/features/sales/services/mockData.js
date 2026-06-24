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

// ── helper ──────────────────────────────────────────────────────────────────
function toJalali(date) {
  const formatter = new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(date));
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}/${m}/${d}`;
}

// ── مشتریان برای فروش ──────────────────────────────────────────────────────
// این لیست باید با allCustomers هماهنگ باشه
const SALE_CUSTOMERS = [
  { id: "1", name: "علی محمدی" },
  { id: "2", name: "فاطمه احمدی" },
  { id: "3", name: "لیلا ابراهیمی" },
];

// ── فروش‌های ثابت ────────────────────────────────────────────────────────────
export const salesMock = [
  {
    id: "1",
    customerId: "1",
    customerName: "علی محمدی",
    invoiceNumber: "SALE-2026-001",
    invoiceDate: toJalali("2026-06-04"),
    status: SALE_STATUSES.DELIVERED,
    paymentType: PAYMENT_TYPES.CASH,
    paidAmount: 45000000,
    totalAmount: 45000000,
    description: "فروش لوازم یدکی موتور",
    items: [
      {
        productId: "1",
        productCode: "BRK-001",
        productName: "لنت ترمز جلو",
        qty: 10,
        unitPrice: 2000000,
        discount: 0,
        lineTotal: 20000000,
      },
      {
        productId: "2",
        productCode: "FLT-002",
        productName: "فیلتر روغن",
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
    id: "2",
    customerId: "2",
    customerName: "فاطمه احمدی",
    invoiceNumber: "SALE-2026-002",
    invoiceDate: toJalali("2026-06-09"),
    status: SALE_STATUSES.PROCESSING,
    paymentType: PAYMENT_TYPES.CREDIT,
    paidAmount: 0,
    totalAmount: 28500000,
    description: "فروش لنت و دیسک ترمز",
    items: [
      {
        productId: "1",
        productCode: "BRK-001",
        productName: "لنت ترمز جلو",
        qty: 10,
        unitPrice: 1900000,
        discount: 5,
        lineTotal: 18050000,
      },
      {
        productId: "3",
        productCode: "SHK-003",
        productName: "کمک فنر جلو",
        qty: 3,
        unitPrice: 3500000,
        discount: 0,
        lineTotal: 10500000,
      },
    ],
    createdAt: "2026-06-09T14:15:00.000Z",
    updatedAt: "2026-06-09T14:15:00.000Z",
  },
];

// ── فروش‌های تولیدی ──────────────────────────────────────────────────────────
function generateMoreSales(count = 20) {
  const products = [
    { id: "1", code: "BRK-001", name: "لنت ترمز جلو", price: 2000000 },
    { id: "2", code: "FLT-002", name: "فیلتر روغن", price: 500000 },
    { id: "3", code: "SHK-003", name: "کمک فنر جلو", price: 3500000 },
    { id: "4", code: "LMP-004", name: "لامپ هدلایت H4", price: 400000 },
    { id: "5", code: "BAT-005", name: "باتری ۶۰ آمپر", price: 6000000 },
  ];

  const statuses = Object.values(SALE_STATUSES);
  const paymentTypes = Object.values(PAYMENT_TYPES);
  const descriptions = [
    "فروش قطعات موتور",
    "فروش لوازم سیستم ترمز",
    "فروش لوازم سیستم تعلیق",
    "فروش لوازم برقی",
    "فروش فیلترها",
    "",
  ];

  const sales = [];
  const baseDate = new Date("2026-01-01");

  for (let i = 0; i < count; i++) {
    const customer =
      SALE_CUSTOMERS[Math.floor(Math.random() * SALE_CUSTOMERS.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentType =
      paymentTypes[Math.floor(Math.random() * paymentTypes.length)];

    const itemsCount = Math.floor(Math.random() * 4) + 1;
    const items = [];
    const usedProductIds = new Set();
    let totalAmount = 0;

    for (let j = 0; j < itemsCount; j++) {
      // انتخاب محصول تصادفی که قبلاً استفاده نشده باشد
      let product;
      let attempts = 0;
      const maxAttempts = 50; // برای جلوگیری از حلقه بی‌نهایت

      // اگر تعداد محصولات موجود کمتر از تعداد آیتم‌های درخواستی باشد، ممکن است نتوانیم محصول جدید پیدا کنیم
      // در این حالت از محصولات باقی‌مانده استفاده می‌کنیم
      const availableProducts = products.filter(
        (p) => !usedProductIds.has(p.id)
      );
      if (availableProducts.length === 0) {
        // اگر همه محصولات استفاده شده‌اند، از حلقه خارج می‌شویم
        break;
      }

      // انتخاب تصادفی از محصولات باقی‌مانده
      const randomIndex = Math.floor(Math.random() * availableProducts.length);
      product = availableProducts[randomIndex];
      usedProductIds.add(product.id);

      // محاسبه تعداد و تخفیف
      const qty = Math.floor(Math.random() * 20) + 1;
      const discount = Math.random() < 0.3 ? Math.floor(Math.random() * 15) : 0;
      const lineTotal = qty * product.price * (1 - discount / 100);

      // افزودن آیتم
      items.push({
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        qty,
        unitPrice: product.price,
        discount,
        lineTotal,
      });
      totalAmount += lineTotal;
    }

    let paidAmount = 0;
    if (paymentType === PAYMENT_TYPES.CREDIT) {
      paidAmount = 0;
    } else if (paymentType === PAYMENT_TYPES.MIXED) {
      paidAmount = Math.floor(totalAmount * (0.3 + Math.random() * 0.4));
    } else {
      paidAmount = totalAmount;
    }

    const daysAgo = Math.floor(Math.random() * 180);
    const saleDate = new Date(baseDate);
    saleDate.setDate(saleDate.getDate() + daysAgo);

    const sale = {
      id: String(salesMock.length + i + 1),
      customerId: customer.id,
      customerName: customer.name,
      invoiceNumber: `SALE-2026-${String(salesMock.length + i + 1).padStart(
        3,
        "0"
      )}`,
      invoiceDate: toJalali(saleDate),
      status,
      paymentType,
      paidAmount,
      totalAmount,
      description:
        descriptions[Math.floor(Math.random() * descriptions.length)],
      items,
      createdAt: saleDate.toISOString(),
      updatedAt: saleDate.toISOString(),
    };

    if (paymentType === PAYMENT_TYPES.CHECK) {
      sale.checkNumber = String(
        Math.floor(Math.random() * 9000000000) + 1000000000
      );
    } else if (paymentType === PAYMENT_TYPES.TRANSFER) {
      sale.transferRef = `TRN-${
        Math.floor(Math.random() * 90000000) + 10000000
      }`;
    }

    sales.push(sale);
  }

  return sales;
}

export const allSales = [...salesMock, ...generateMoreSales(20)];
