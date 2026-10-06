import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";
import { TaxCategoryEnum } from "@/shared/domain/enums/taxCategory";
import { useImageUpload } from "@/shared/hooks/useImageUpload";

/**
 * فیلدهای فرم با *همان نام‌های* `ProductDto`/`UpdateProductCommand`. فقط
 * `taxExempt` مالِ فرم است (چک‌باکس به‌جای `taxCategory`)؛ `code`/`barCode`
 * فقط نمایشی‌اند و فرستاده نمی‌شوند.
 */
const EMPTY_PRODUCT = {
  name: "",
  englishName: "",
  code: "",
  barCode: "",
  productCategoryId: "",
  brand: "",
  unit: "",
  stock: "",
  lowStockThreshold: 10,
  purchasePrice: 0,
  retailPrice: 0,
  wholeSalePrice: 0,
  tax: "",
  taxExempt: false,
  requiresUnitTracking: false,
};

function buildDefaultValues(product) {
  if (!product) return EMPTY_PRODUCT;
  const values = Object.fromEntries(
    Object.keys(EMPTY_PRODUCT).map((key) => [key, product[key] ?? EMPTY_PRODUCT[key]]),
  );
  return {
    ...values,
    // صفر در این دو فیلد با جای خالی نشان داده می‌شود.
    stock: product.stock || "",
    tax: product.tax || "",
    taxExempt: product.taxCategory === TaxCategoryEnum.EXEMPT,
    requiresUnitTracking: Boolean(product.requiresUnitTracking),
  };
}

export function useProductForm(initialData = null) {
  // تصویر دیگر داخل فرم نگه داشته نمی‌شود: فایل بلافاصله آپلود می‌شود و
  // فقط `objectKey` آن در payload می‌رود (بخش ۱۷ سند).
  const imageUpload = useImageUpload({
    folder: ImageFolderEnum.PRODUCTS,
    initialKey: initialData?.imageKey ?? null,
    initialUrl: initialData?.imageUrl ?? null,
  });

  const formMethods = useForm({
    defaultValues: buildDefaultValues(initialData),
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /**
   * بدنه‌ی `CreateProductCommand`/`UpdateProductCommand` — همان نام‌ها، فقط
   * تبدیلِ عددی:
   *
   * - `code`/`barCode` فرستاده نمی‌شوند؛ سرور خودش می‌سازدشان.
   * - `productCategoryId` عدد است؛ اعتبارسنجیِ سرور روی `> 0` است.
   * - کلیدِ تصویر در `imageKey` می‌رود؛ `null` یعنی «تصویر را پاک کن».
   * - `isIncomplete` فرستاده نمی‌شود: فقط ساختِ سریع در انبار آن را روشن
   *   می‌کند و سرور وقتی برند و سه قیمت پر شد خودش خاموشش می‌کند.
   */
  const buildProductPayload = (formData) => ({
    name: formData.name,
    englishName: formData.englishName || null,
    brand: formData.brand,
    unit: Number(formData.unit),
    productCategoryId: Number(formData.productCategoryId) || 0,
    stock: Number(formData.stock) || 0,
    lowStockThreshold: Number(formData.lowStockThreshold) || 0,
    purchasePrice: Number(formData.purchasePrice) || 0,
    retailPrice: Number(formData.retailPrice) || 0,
    wholeSalePrice: Number(formData.wholeSalePrice) || 0,
    tax: Number(formData.tax) || 0,
    taxCategory: formData.taxExempt ? TaxCategoryEnum.EXEMPT : TaxCategoryEnum.TAXABLE,
    requiresUnitTracking: Boolean(formData.requiresUnitTracking),
    imageKey: imageUpload.imageKeyPayload,
  });

  return { formMethods, imageUpload, buildProductPayload };
}
