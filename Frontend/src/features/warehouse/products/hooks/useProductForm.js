// src/features/warehouse/products/hooks/useProductForm.js
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";
import { useImageUpload } from "@/shared/hooks/useImageUpload";

function buildDefaultValues(data) {
  if (!data) {
    return {
      name: "",
      code: "",
      barcode: "",
      productCategoryId: "",
      brand: "",
      unit: "",
      initialStock: 0,
      lowStockThreshold: 10,
      purchasePrice: 0,
      sellPrice1: 0,
      sellPrice2: 0,
      vat: 0,
    };
  }
  return {
    name: data.name || "",
    code: data.code || "",
    barcode: data.barcode || "",
    productCategoryId: data.productCategoryId ?? "",
    brand: data.brand || "",
    unit: data.unit ?? "",
    initialStock: data.stock ?? data.initialStock ?? 0,
    lowStockThreshold: data.lowStockThreshold ?? 10,
    purchasePrice: data.purchasePrice || 0,
    sellPrice1: data.retailPrice ?? data.sellPrice1 ?? 0,
    sellPrice2: data.wholeSalePrice ?? data.sellPrice2 ?? 0,
    vat: data.tax ?? data.vat ?? 0,
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

  // بارکد دیگر ورودی کاربر نیست؛ فقط همان چیزی است که سرور ساخته و در
  // فرم نشسته — پس مستقیم از فرم خوانده می‌شود، بدون stateِ موازی.
  const barcodeValue = formMethods.watch("barcode")?.trim() || "";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /**
   * پیلود دقیقاً همان فیلدهای `CreateProductCommand`/`UpdateProductCommand`
   * است — نه بیشتر، نه با نام دیگر:
   *
   * - `code`/`barcode` اصلاً وجود ندارند؛ سرور خودش می‌سازدشان.
   * - `productCategoryId` عدد است، نه نامِ دسته‌بندی. اعتبارسنجیِ سرور
   *   روی `> 0` است، پس رشته‌ی خالی رد می‌شود.
   * - `wholeSalePrice` با همین حروفِ بزرگ‌وکوچک (قبلاً `wholesalePrice`
   *   فرستاده می‌شد و بی‌صدا کنار گذاشته می‌شد — یعنی قیمت عمده هرگز
   *   ذخیره نمی‌شد).
   * - کلیدِ تصویر در `imageObjectKey` می‌رود نه `imageUrl`؛ `null` یعنی
   *   «تصویر را پاک کن».
   */
  const buildProductPayload = (formData) => ({
    name: formData.name,
    brand: formData.brand,
    unit: Number(formData.unit),
    productCategoryId: Number(formData.productCategoryId) || 0,
    stock: Number(formData.initialStock) || 0,
    lowStockThreshold: Number(formData.lowStockThreshold) || 0,
    purchasePrice: Number(formData.purchasePrice) || 0,
    retailPrice: Number(formData.sellPrice1) || 0,
    wholeSalePrice: Number(formData.sellPrice2) || 0,
    tax: Number(formData.vat) || 0,
    imageObjectKey: imageUpload.imageKeyPayload,
  });

  return {
    formMethods,
    imageUpload,
    barcodeValue,
    buildProductPayload,
  };
}