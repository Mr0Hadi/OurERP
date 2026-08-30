// features/warehouse/products/services/mockData.js
import { ProductUnitEnum } from "@/shared/domain/enums/productUnit";
import {
  buildProductCode,
  toPayload,
} from "@/shared/services/barcode/productCode";
import {
  allProductCategories,
  categoryNameOf,
} from "@/features/warehouse/categories/services/mockData";

/**
 * کد و بارکدِ کالا **ساختِ سرور** هستند، نه چیزی که کاربر وارد کند یا
 * mock از دسته‌بندی بسازد: بکند در `CreateProductCommand` بلافاصله بعد
 * از گرفتنِ `Id` مقدارشان را می‌گذارد و بعد از آن هرگز عوض نمی‌شوند
 * (چون روی برچسب چاپ شده‌اند).
 *
 *   code    = تاریخِ جلالیِ ساخت + شناسه‌ی کالا →  `14050608-0000000010`
 *   barCode = همان کد بدونِ خط‌تیره            →  `140506080000000010`
 *
 * پس اینجا هم همان قانون اجرا می‌شود، نه یک الگوی دسته‌بندی‌محورِ
 * جداگانه؛ وگرنه بارکدی که در mock چاپ می‌شود با چیزی که سرور
 * می‌شناسد یکی نیست.
 */
const withGeneratedCode = (product) => {
  const code = buildProductCode(product.id, product.createdAt);
  return {
    ...product,
    code,
    barcode: toPayload(code),
    // بکند در فهرست `categoryName` می‌دهد و در جزئیات `productCategoryId`؛
    // mock هم هر دو را دارد تا هیچ صفحه‌ای نامِ دسته را از روی شناسه
    // دستی حساب نکند.
    categoryName: categoryNameOf(product.productCategoryId),
  };
};

export const productsMock = [
  {
    id: 1,
    name: "لنت ترمز جلو",
    brand: "بوش",
    productCategoryId: 7,
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
    name: 'فیلتر روغن',
    brand: 'مان',
    productCategoryId: 6,
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
    name: 'کمک فنر جلو',
    brand: 'ساکس',
    productCategoryId: 8,
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
      name: `قطعه نمونه ${i}`,
      brand: brands[i % brands.length],
      productCategoryId: allProductCategories[i % allProductCategories.length].id,
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
  return products.map(withGeneratedCode);
};

export const allProducts = generateMoreProducts(50);
