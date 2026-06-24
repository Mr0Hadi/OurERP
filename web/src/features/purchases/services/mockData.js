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

// داده‌های نمونه خرید
export const purchasesMock = [
  {
    id: "1",
    supplierId: "1",
    supplierName: "ایران قطعه",
    invoiceNumber: "INV-2026-001",
    invoiceDate: "1405/03/15",
    status: PURCHASE_STATUSES.RECEIVED,
    paymentType: PAYMENT_TYPES.CASH,
    paidAmount: 45000000,
    totalAmount: 45000000,
    description: "خرید لوازم یدکی موتور",
    items: [
      {
        productId: "1",
        productCode: "BRK-001",
        productName: "لنت ترمز جلو",
        qty: 20,
        unitPrice: 1500000,
        discount: 0,
        lineTotal: 30000000,
      },
      {
        productId: "2",
        productCode: "FLT-002",
        productName: "فیلتر روغن",
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
    id: "2",
    supplierId: "2",
    supplierName: "لنت پارس موتور",
    invoiceNumber: "INV-2026-002",
    invoiceDate: "1405/03/20",
    status: PURCHASE_STATUSES.SHIPPED,
    paymentType: PAYMENT_TYPES.CREDIT,
    paidAmount: 0,
    totalAmount: 28500000,
    description: "خرید لنت و دیسک ترمز",
    items: [
      {
        productId: "1",
        productCode: "BRK-001",
        productName: "لنت ترمز جلو",
        qty: 15,
        unitPrice: 1500000,
        discount: 5,
        lineTotal: 21375000,
      },
      {
        productId: "3",
        productCode: "SHK-003",
        productName: "کمک فنر جلو",
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
    id: "3",
    supplierId: "3",
    supplierName: "پخش بلبرینگ مرکزی",
    invoiceNumber: "INV-2026-003",
    invoiceDate: "1405/03/25",
    status: PURCHASE_STATUSES.PARTIALLY_RECEIVED,
    paymentType: PAYMENT_TYPES.CHECK,
    paidAmount: 50000000,
    totalAmount: 50000000,
    checkNumber: "7845612301",
    description: "خرید یاتاقان و بلبرینگ",
    items: [
      {
        productId: "6",
        productCode: "BRG-006",
        productName: "کاسه چرخ عقب",
        qty: 30,
        unitPrice: 800000,
        discount: 10,
        lineTotal: 21600000,
      },
      {
        productId: "9",
        productCode: "ENG-009",
        productName: "یاتاقان شاتون",
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
    id: "4",
    supplierId: "1",
    supplierName: "ایران قطعه",
    invoiceNumber: "INV-2026-004",
    invoiceDate: "1405/03/28",
    status: PURCHASE_STATUSES.PENDING,
    paymentType: PAYMENT_TYPES.TRANSFER,
    paidAmount: 35000000,
    totalAmount: 35000000,
    transferRef: "TRN-98765432",
    description: "خرید فیلترها و روغن موتور",
    items: [
      {
        productId: "2",
        productCode: "FLT-002",
        productName: "فیلتر روغن",
        qty: 60,
        unitPrice: 300000,
        discount: 0,
        lineTotal: 18000000,
      },
      {
        productId: "7",
        productCode: "FLT-007",
        productName: "فیلتر هوای موتور",
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
    id: "5",
    supplierId: "2",
    supplierName: "لنت پارس موتور",
    invoiceNumber: "INV-2026-005",
    invoiceDate: "1405/04/01",
    status: PURCHASE_STATUSES.RECEIVED,
    paymentType: PAYMENT_TYPES.MIXED,
    paidAmount: 60000000,
    totalAmount: 82500000,
    description: "خرید کلاچ و دیسک کلاچ",
    items: [
      {
        productId: "10",
        productCode: "CLT-010",
        productName: "کلاچ کامل",
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
    id: "6",
    supplierId: "1",
    supplierName: "ایران قطعه",
    invoiceNumber: "INV-2026-006",
    invoiceDate: "1405/04/02",
    status: PURCHASE_STATUSES.CANCELLED,
    paymentType: PAYMENT_TYPES.CREDIT,
    paidAmount: 0,
    totalAmount: 24000000,
    description: "خرید لامپ - لغو شده به دلیل عدم موجودی",
    items: [
      {
        productId: "4",
        productCode: "LMP-004",
        productName: "لامپ هدلایت H4",
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

// تابع تولید خریدهای بیشتر
function generateMorePurchases(count = 20) {
  const suppliers = [
    { id: "1", name: "ایران قطعه" },
    { id: "2", name: "لنت پارس موتور" },
    { id: "3", name: "پخش بلبرینگ مرکزی" },
  ];

  const products = [
    { id: "1", code: "BRK-001", name: "لنت ترمز جلو", price: 1500000 },
    { id: "2", code: "FLT-002", name: "فیلتر روغن", price: 300000 },
    { id: "3", code: "SHK-003", name: "کمک فنر جلو", price: 1800000 },
    { id: "4", code: "LMP-004", name: "لامپ هدلایت H4", price: 240000 },
    { id: "5", code: "BAT-005", name: "باتری ۶۰ آمپر", price: 4500000 },
    { id: "6", code: "BRG-006", name: "کاسه چرخ عقب", price: 800000 },
    { id: "7", code: "FLT-007", name: "فیلتر هوای موتور", price: 425000 },
    { id: "8", code: "SHK-008", name: "کمک فنر عقب", price: 1850000 },
    { id: "9", code: "ENG-009", name: "یاتاقان شاتون", price: 1420000 },
    { id: "10", code: "CLT-010", name: "کلاچ کامل", price: 5500000 },
  ];

  const statuses = Object.values(PURCHASE_STATUSES);
  const paymentTypes = Object.values(PAYMENT_TYPES);

  const descriptions = [
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

  const purchases = [];
  const baseDate = new Date("2026-01-01");
  const usedProductIds = new Set();

  for (let i = 0; i < count; i++) {
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentType =
      paymentTypes[Math.floor(Math.random() * paymentTypes.length)];

    // تعداد آیتم‌های تصادفی (1 تا 5)
    const itemsCount = Math.floor(Math.random() * 5) + 1;
    const items = [];
    let totalAmount = 0;
    const usedProductIds = new Set(); // ← برای جلوگیری از تکرار productId

    for (let j = 0; j < itemsCount; j++) {
      // محصولات استفاده‌نشده را پیدا کن
      const availableProducts = products.filter(
        (p) => !usedProductIds.has(p.id)
      );
      if (availableProducts.length === 0) break; // اگر محصولی باقی نمانده، حلقه را متوقف کن

      // انتخاب تصادفی از محصولات باقی‌مانده
      const randomIndex = Math.floor(Math.random() * availableProducts.length);
      const product = availableProducts[randomIndex];
      usedProductIds.add(product.id);

      const qty = Math.floor(Math.random() * 30) + 5;
      const discount = Math.random() < 0.3 ? Math.floor(Math.random() * 15) : 0;
      const lineTotal = qty * product.price * (1 - discount / 100);

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

    // محاسبه مبلغ پرداختی
    let paidAmount = 0;
    if (paymentType === PAYMENT_TYPES.CREDIT) {
      paidAmount = 0;
    } else if (paymentType === PAYMENT_TYPES.MIXED) {
      paidAmount = Math.floor(totalAmount * (0.3 + Math.random() * 0.4));
    } else {
      paidAmount = totalAmount;
    }

    // تاریخ تصادفی در 6 ماه گذشته
    const daysAgo = Math.floor(Math.random() * 180);
    const purchaseDate = new Date(baseDate);
    purchaseDate.setDate(purchaseDate.getDate() + daysAgo);

    const purchase = {
      id: String(purchasesMock.length + i + 1),
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNumber: `INV-2026-${String(purchasesMock.length + i + 1).padStart(
        3,
        "0"
      )}`,
      invoiceDate: new Intl.DateTimeFormat("fa-IR").format(purchaseDate),
      status,
      paymentType,
      paidAmount,
      totalAmount,
      description:
        descriptions[Math.floor(Math.random() * descriptions.length)],
      items,
      createdAt: purchaseDate.toISOString(),
      updatedAt: purchaseDate.toISOString(),
    };

    // فیلدهای اضافی بسته به نوع پرداخت
    if (paymentType === PAYMENT_TYPES.CHECK) {
      purchase.checkNumber = String(
        Math.floor(Math.random() * 9000000000) + 1000000000
      );
    } else if (paymentType === PAYMENT_TYPES.TRANSFER) {
      purchase.transferRef = `TRN-${
        Math.floor(Math.random() * 90000000) + 10000000
      }`;
    }

    purchases.push(purchase);
  }

  return purchases;
}

// آرایه نهایی خریدها
export const allPurchases = [...purchasesMock, ...generateMorePurchases(20)];
