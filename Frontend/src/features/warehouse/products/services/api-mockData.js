// src/features/warehouse/products/services/api-mockData.js
import {
  allProducts,
  CATEGORY_CODES,
  UNKNOWN_CATEGORY_CODE,
} from './mockData';
import { todayPersianCompact } from '@/shared/utils/dateUtils';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const categoryCodeOf = (category) =>
  CATEGORY_CODES[String(category ?? '').trim()] ?? UNKNOWN_CATEGORY_CODE;

/**
 * شماره‌ی بعدی برای شناسه‌هایی که با prefix مشترک شروع می‌شوند؛ یعنی
 * شمارنده به‌ازای هر (دسته‌بندی، تاریخ) جداگانه پیش می‌رود. بزرگ‌ترین
 * شماره‌ی موجود مبنا قرار می‌گیرد تا حذف یک کالا باعث تکراری‌شدن نشود.
 */
const nextSequence = (values, prefix, length) => {
  const max = values.reduce((acc, value) => {
    const text = String(value ?? '');
    if (!text.startsWith(prefix)) return acc;
    const tail = text.slice(prefix.length);
    if (!/^\d+$/.test(tail)) return acc;
    return Math.max(acc, Number(tail));
  }, 0);

  return String(max + 1).padStart(length, '0');
};

/** کد کالا: YYYYMMDD-CC-NNN (مثال: 14050523-04-001) */
export const generateProductCode = async ({ category } = {}) => {
  await delay(400);

  const prefix = `${todayPersianCompact('YYYYMMDD')}-${categoryCodeOf(category)}-`;
  const sequence = nextSequence(
    allProducts.map((p) => p.code),
    prefix,
    3
  );

  return { code: `${prefix}${sequence}` };
};

/** بارکد: YYMMDDCCNNNNN — سیزده رقم و فقط رقم (مثال: 0505230400001) */
export const generateProductBarcode = async ({ category } = {}) => {
  await delay(400);

  const prefix = `${todayPersianCompact('YYMMDD')}${categoryCodeOf(category)}`;
  const sequence = nextSequence(
    allProducts.map((p) => p.barcode),
    prefix,
    5
  );

  return { barcode: `${prefix}${sequence}` };
};

/**
 * تغییر موجودی یک یا چند کالا به‌صورت دلتا (مثبت = افزایش، منفی =
 * کاهش). این تنها نقطه‌ای است که مستقیماً stock کالا را تغییر می‌دهد؛
 * ماژول‌های دیگر (فروش، دریافت خرید، دریافت مرجوعی) باید فقط از این
 * تابع استفاده کنند تا منطق موجودی در یک‌جا متمرکز بماند.
 *
 * items: [{ productId, delta }]
 */
export function adjustProductsStock(items = []) {
  items.forEach(({ productId, delta }) => {
    if (!delta) return;
    const index = allProducts.findIndex((p) => Number(p.id) === Number(productId));
    if (index === -1) return;
    allProducts[index] = {
      ...allProducts[index],
      stock: Math.max(0, (allProducts[index].stock || 0) + delta),
      updatedAt: new Date().toISOString(),
    };
  });
}

export const fetchProducts = async (params) => {
  await delay(500);

  let filteredProducts = [...allProducts];

  if (params.search) {
    const searchTerm = params.search.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.code.toLowerCase().includes(searchTerm) ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.brand.toLowerCase().includes(searchTerm) ||
      p.barcode?.toLowerCase().includes(searchTerm)
    );
  }

  if (params.brand) {
    filteredProducts = filteredProducts.filter(p => p.brand === params.brand);
  }

  if (params.category) {
    filteredProducts = filteredProducts.filter(p => p.category === params.category);
  }

  if (params.minPrice) {
    filteredProducts = filteredProducts.filter(p => p.retailPrice >= Number(params.minPrice));
  }

  if (params.maxPrice) {
    filteredProducts = filteredProducts.filter(p => p.retailPrice <= Number(params.maxPrice));
  }

  if (params.stockStatus) {
    switch (params.stockStatus) {
      case 'inStock':
        filteredProducts = filteredProducts.filter(
          (p) => p.stock > (p.lowStockThreshold ?? 10)
        );
        break;
      case 'lowStock':
        filteredProducts = filteredProducts.filter(
          (p) => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 10)
        );
        break;
      case 'outOfStock':
        filteredProducts = filteredProducts.filter((p) => p.stock === 0);
        break;
    }
  }

  if (params.sortBy) {
    const sortOrder = params.sortOrder === 'desc' ? -1 : 1;
    filteredProducts.sort((a, b) => {
      if (a[params.sortBy] < b[params.sortBy]) return -sortOrder;
      if (a[params.sortBy] > b[params.sortBy]) return sortOrder;
      return 0;
    });
  }

  const page = params.page || 1;
  const limit = params.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    items: filteredProducts.slice(startIndex, endIndex),
    total: filteredProducts.length,
    page,
    totalPages: Math.ceil(filteredProducts.length / limit),
  };
};

export const fetchProductById = async (id) => {
  await delay(300);
  const product = allProducts.find((p) => Number(p.id) === Number(id));
  if (!product) throw new Error('محصول یافت نشد');
  return product;
};

/** جست‌وجوی دقیق با بارکد یا کد کالا — برای اسکن. */
export const fetchProductByBarcode = async (code) => {
  await delay(200);
  const term = String(code ?? '').trim();
  if (!term) return null;
  return (
    allProducts.find((p) => p.barcode === term) ||
    allProducts.find((p) => p.code === term) ||
    null
  );
};

export const createProduct = async (productData) => {
  await delay(800);

  if (Math.random() < 0.1) {
    throw new Error("خطای سرور در ایجاد کالا");
  }

  const newId = allProducts.length
    ? Math.max(...allProducts.map((p) => Number(p.id) || 0)) + 1
    : 1;

  const newProduct = {
    id: newId,
    ...productData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allProducts.unshift(newProduct);
  return newProduct;
};

export const updateProduct = async (id, productData) => {
  await delay(500);

  const index = allProducts.findIndex((p) => Number(p.id) === Number(id));

  if (index === -1) {
    throw new Error("محصول یافت نشد");
  }

  const updatedProduct = {
    ...allProducts[index],
    ...productData,
    id: allProducts[index].id,
    updatedAt: new Date().toISOString()
  };

  allProducts[index] = updatedProduct;
  return updatedProduct;
};

export const deleteProduct = async (id) => {
  await delay(500);

  const index = allProducts.findIndex((p) => Number(p.id) === Number(id));

  if (index === -1) {
    throw new Error("محصول یافت نشد");
  }

  allProducts.splice(index, 1);
  return { success: true, id };
};