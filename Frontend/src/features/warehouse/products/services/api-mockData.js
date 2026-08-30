// src/features/warehouse/products/services/api-mockData.js
import { allProducts } from './mockData';
import {
  buildProductCode,
  parseBarcode,
  toPayload,
} from '@/shared/services/barcode/productCode';
import { BarcodeReferenceKindEnum } from '@/shared/domain/enums/barcodeReferenceKind';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  if (params.productCategoryId) {
    filteredProducts = filteredProducts.filter(
      (p) => Number(p.productCategoryId) === Number(params.productCategoryId),
    );
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

/**
 * جست‌وجوی دقیق با بارکد یا کد کالا — برای اسکن.
 *
 * تطبیق روی *payload* انجام می‌شود نه رشته‌ی خام: اسکنر گاهی کدِ خوانا
 * (با خط‌تیره) می‌دهد و گاهی فقط رقم‌ها را، و مقایسه‌ی رشته‌ای یکی از
 * این دو را همیشه ناموفق می‌کند. بارکدِ یک *دانه* هم پذیرفته می‌شود و
 * به کالای همان دانه می‌رسد — چون کدِ کالا داخلِ بارکدِ دانه است.
 */
export const fetchProductByBarcode = async (code) => {
  await delay(200);

  const reference = parseBarcode(code);
  if (reference.kind === BarcodeReferenceKindEnum.UNKNOWN) return null;

  return (
    allProducts.find((p) => Number(p.id) === reference.productId) ?? null
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

  const createdAt = new Date().toISOString();

  // کد و بارکد از پیلود نمی‌آیند: بکند آن‌ها را *بعد* از گرفتنِ `Id`
  // خودش می‌سازد (`CreateProductCommandHandler`)، دقیقاً به همین شکل.
  const code = buildProductCode(newId, createdAt);

  const newProduct = {
    ...productData,
    id: newId,
    code,
    barcode: toPayload(code),
    createdAt,
    updatedAt: createdAt,
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

  // کد و بارکد بعد از ساختِ کالا ثابت می‌مانند (روی برچسب چاپ شده‌اند)،
  // پس حتی اگر در پیلود بیایند نادیده گرفته می‌شوند — همان کاری که
  // `UpdateProductCommand` می‌کند، چون اصلاً این دو فیلد را ندارد.
  const updatedProduct = {
    ...allProducts[index],
    ...productData,
    id: allProducts[index].id,
    code: allProducts[index].code,
    barcode: allProducts[index].barcode,
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