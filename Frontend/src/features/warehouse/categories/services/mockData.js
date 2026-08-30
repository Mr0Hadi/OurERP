// src/features/warehouse/categories/services/mockData.js

/**
 * دسته‌بندی کالا یک *موجودیت* است (`api/ProductCategory`)، نه یک رشته‌ی
 * آزاد: کالا با `productCategoryId` به آن وصل می‌شود.
 *
 * تا پیش از این، فرانت دسته‌بندی را به‌صورت متنِ آزاد نگه می‌داشت و
 * کاربر می‌توانست هر نامی بسازد که فقط در حافظه‌ی مرورگر می‌ماند؛
 * `CreateProductCommand` چنین چیزی را نمی‌پذیرد و روی
 * `ProductCategoryId > 0` اعتبارسنجی می‌کند.
 */
export const allProductCategories = [
  { id: 1, name: "روغن موتور", productCount: 0 },
  { id: 2, name: "فیلتر", productCount: 0 },
  { id: 3, name: "لنت ترمز", productCount: 0 },
  { id: 4, name: "برق و روشنایی", productCount: 0 },
  { id: 5, name: "تسمه", productCount: 0 },
  { id: 6, name: "موتور", productCount: 0 },
  { id: 7, name: "سیستم ترمز", productCount: 0 },
  { id: 8, name: "سیستم تعلیق", productCount: 0 },
  { id: 9, name: "بدنه", productCount: 0 },
  { id: 10, name: "گیربکس", productCount: 0 },
  { id: 11, name: "سیستم خنک کننده", productCount: 0 },
];

export const categoryNameOf = (productCategoryId) =>
  allProductCategories.find((c) => Number(c.id) === Number(productCategoryId))
    ?.name ?? "";
