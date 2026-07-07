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
// تابع کمکی برای فرمت‌دهی تاریخ میلادی به فرمت استاندارد YYYY-MM-DD
function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── مشتریان برای فروش ──────────────────────────────────────────────────────
// این لیست باید با allCustomers هماهنگ باشه
const SALE_CUSTOMERS = [
  { id: "1", name: "علی محمدی" },
  { id: "2", name: "فاطمه احمدی" },
  { id: "3", name: "لیلا ابراهیمی" },
];

// ── فروش‌های ثابت با تاریخ میلادی ────────────────────────────────────────────
export const salesMock = [
  {
    id: "1",
    customerId: "1",
    customerName: "علی محمدی",
    invoiceNumber: "SALE-2026-001",
    invoiceDate: "2026-06-04", // 4 June 2026
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
    invoiceDate: "2026-06-09", // 9 June 2026
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
  {
    id: "3",
    customerId: "3",
    customerName: "لیلا ابراهیمی",
    invoiceNumber: "SALE-2026-003",
    invoiceDate: "2026-06-15", // 15 June 2026
    status: SALE_STATUSES.DELIVERED,
    paymentType: PAYMENT_TYPES.MIXED,
    paidAmount: 35000000,
    totalAmount: 35000000,
    description: "فروش باتری و لوازم برقی",
    mixedPayments: [
      { type: 'cash', amount: 15000000 },
      { type: 'check', amount: 10000000, checkNumber: '1234567890' },
      { type: 'transfer', amount: 10000000, transferRef: 'TRN-87654321' },
    ],
    items: [
      {
        productId: "5",
        productCode: "BAT-005",
        productName: "باتری ۶۰ آمپر",
        qty: 5,
        unitPrice: 6000000,
        discount: 0,
        lineTotal: 30000000,
      },
      {
        productId: "4",
        productCode: "LMP-004",
        productName: "لامپ هدلایت H4",
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

// ── فروش‌های تولیدی با تاریخ میلادی ──────────────────────────────────────────
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
      const availableProducts = products.filter(
        (p) => !usedProductIds.has(p.id)
      );
      if (availableProducts.length === 0) {
        // اگر همه محصولات استفاده شده‌اند، از حلقه خارج می‌شویم
        break;
      }

      // انتخاب تصادفی از محصولات باقی‌مانده
      const randomIndex = Math.floor(Math.random() * availableProducts.length);
      const product = availableProducts[randomIndex];
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
    let mixedPayments = [];

    if (paymentType === PAYMENT_TYPES.CREDIT) {
      paidAmount = 0;
    } else if (paymentType === PAYMENT_TYPES.MIXED) {
      // تولید 2 تا 4 پرداخت ترکیبی
      const numPayments = Math.floor(Math.random() * 3) + 2; // 2 تا 4
      const paymentMethods = ['cash', 'check', 'transfer'];
      let remainingAmount = totalAmount;

      for (let j = 0; j < numPayments; j++) {
        const isLast = j === numPayments - 1;
        const amount = isLast
          ? remainingAmount
          : Math.floor(remainingAmount * (0.2 + Math.random() * 0.4));

        const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        const payment = { type: method, amount };

        if (method === 'check') {
          payment.checkNumber = String(
            Math.floor(Math.random() * 9000000000) + 1000000000
          );
        } else if (method === 'transfer') {
          payment.transferRef = `TRN-${
            Math.floor(Math.random() * 90000000) + 10000000
          }`;
        }

        mixedPayments.push(payment);
        remainingAmount -= amount;
      }

      paidAmount = totalAmount;
    } else {
      paidAmount = totalAmount;
    }

    // تاریخ تصادفی در 6 ماه گذشته با فرمت میلادی (YYYY-MM-DD)
    const daysAgo = Math.floor(Math.random() * 180);
    const saleDate = new Date(baseDate);
    saleDate.setDate(saleDate.getDate() + daysAgo);
    
    // استخراج سال، ماه و روز به صورت میلادی
    const year = saleDate.getFullYear();
    const month = saleDate.getMonth() + 1; // ماه‌ها از 0 شروع می‌شوند
    const day = saleDate.getDate();
    const invoiceDate = formatDate(year, month, day);

    const sale = {
      id: String(salesMock.length + i + 1),
      customerId: customer.id,
      customerName: customer.name,
      invoiceNumber: `SALE-2026-${String(salesMock.length + i + 1).padStart(
        3,
        "0"
      )}`,
      invoiceDate,
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

    // اضافه کردن mixedPayments در صورت نیاز
    if (paymentType === PAYMENT_TYPES.MIXED) {
      sale.mixedPayments = mixedPayments;
    }

    // اضافه کردن فیلدهای مربوط به چک و انتقال بانکی
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
