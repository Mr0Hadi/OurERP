// features/warehouse/products/services/mockData.js
import { ProductUnitEnum } from "@/shared/domain/enums/productUnit";

/**
 * کد دو رقمی هر دسته‌بندی، برای ساختن کد کالا و بارکد خودکار.
 * تا زمانی که دسته‌بندی‌ها موجودیت مستقلی با شناسه‌ی خودشان نشده‌اند،
 * این نگاشت جای شناسه‌ی دسته‌بندی در بک‌اند واقعی را می‌گیرد.
 * شامل هر دو فهرست دسته‌بندی موجود است (DEFAULT_CATEGORIES در
 * useProductForm و دسته‌بندی‌های همین فایل).
 */
export const CATEGORY_CODES = {
  "روغن موتور": "01",
  "فیلتر": "02",
  "لنت ترمز": "03",
  "برق و روشنایی": "04",
  "تسمه": "05",
  "موتور": "06",
  "سیستم ترمز": "07",
  "سیستم تعلیق": "08",
  "بدنه": "09",
  "گیربکس": "10",
  "سیستم خنک کننده": "11",
};

/** وقتی دسته‌بندی انتخاب نشده یا در نگاشت بالا نیست. */
export const UNKNOWN_CATEGORY_CODE = "00";

export const productsMock = [
  {
    id: 1,
    code: "BRK-1001",
    barcode: "6260000000001",
    name: "لنت ترمز جلو",
    brand: "بوش",
    category: "سیستم ترمز",
    unit: ProductUnitEnum.HAND,
    purchasePrice: 350000,
    retailPrice: 450000,
    wholesalePrice: 420000,
    tax: 9,
    stock: 45,
    lowStockThreshold: 10,
    image: "",
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-06-15T12:00:00Z",
  },
  {
    id: 2,
    code: 'FLT-2022',
    barcode: '6260000000002',
    name: 'فیلتر روغن',
    brand: 'مان',
    category: 'موتور',
    unit: ProductUnitEnum.NUMBER,
    purchasePrice: 90000,
    retailPrice: 120000,
    wholesalePrice: 105000,
    tax: 9,
    stock: 120,
    image: '',
    createdAt: "2024-01-11T08:00:00Z",
    updatedAt: "2024-06-16T12:00:00Z",
  },
  {
    id: 3,
    code: 'SHK-305',
    barcode: '6260000000003',
    name: 'کمک فنر جلو',
    brand: 'ساکس',
    category: 'سیستم تعلیق',
    unit: ProductUnitEnum.NUMBER,
    purchasePrice: 1500000,
    retailPrice: 1850000,
    wholesalePrice: 1700000,
    tax: 9,
    stock: 8,
    image: '',
    createdAt: "2024-01-12T08:00:00Z",
    updatedAt: "2024-06-17T12:00:00Z",
  },
];

const generateMoreProducts = (count) => {
  const brands = [
    "بوش",
    "مان",
    "ساکس",
    "لنکر",
    "تویس",
    "ماله",
    "دنسو",
    "میتسوبیشی",
  ];
  const categories = [
    "موتور",
    "سیستم ترمز",
    "سیستم تعلیق",
    "برق و روشنایی",
    "بدنه",
    "گیربکس",
    "سیستم خنک کننده",
  ];
  const units = [
    ProductUnitEnum.NUMBER,
    ProductUnitEnum.PACKAGE,
    ProductUnitEnum.HAND,
    ProductUnitEnum.PAIR,
    ProductUnitEnum.KIT,
  ];

  const products = [...productsMock];

  for (let i = productsMock.length + 1; i <= count; i++) {
    const retailPrice = 100000 + i * 25000;
    const purchasePrice = retailPrice * 0.75;
    const wholesalePrice = retailPrice * 0.9;

    products.push({
      id: i,
      code: `MOCK-${i}`,
      barcode: `6260000000${String(i).padStart(3, "0")}`,
      name: `قطعه نمونه ${i}`,
      brand: brands[i % brands.length],
      category: categories[i % categories.length],
      unit: units[i % units.length],
      purchasePrice: purchasePrice,
      retailPrice: retailPrice,
      wholesalePrice: wholesalePrice,
      tax: 9,
      stock: Math.floor(Math.random() * 100),
      lowStockThreshold: 10,
      image: "",
      createdAt: new Date(2024, 0, 1 + i).toISOString(),
      updatedAt: new Date(2024, 0, 1 + i).toISOString(),
    });
  }
  return products;
};

export const allProducts = generateMoreProducts(50);
