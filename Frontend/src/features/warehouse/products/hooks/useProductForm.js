// src/features/warehouse/products/hooks/useProductForm.js
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";
import { useImageUpload } from "@/shared/hooks/useImageUpload";

const DEFAULT_CATEGORIES = [
  { id: "روغن موتور", name: "روغن موتور" },
  { id: "فیلتر", name: "فیلتر" },
  { id: "لنت ترمز", name: "لنت ترمز" },
  { id: "برق و روشنایی", name: "برق و روشنایی" },
  { id: "تسمه", name: "تسمه" },
];

function buildDefaultValues(data) {
  if (!data) {
    return {
      name: "",
      code: "",
      barcode: "",
      category: "",
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
    category: data.category || "",
    brand: data.brand || "",
    unit: data.unit ?? "",
    initialStock: data.stock ?? data.initialStock ?? 0,
    lowStockThreshold: data.lowStockThreshold ?? 10,
    purchasePrice: data.purchasePrice || 0,
    sellPrice1: data.retailPrice ?? data.sellPrice1 ?? 0,
    sellPrice2: data.wholesalePrice ?? data.sellPrice2 ?? 0,
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

  const [barcodeValue, setBarcodeValue] = useState(initialData?.barcode || "");
  const [categories, setCategories] = useState(() => {
    if (
      initialData?.category &&
      !DEFAULT_CATEGORIES.some((c) => c.id === initialData.category)
    ) {
      return [
        ...DEFAULT_CATEGORIES,
        { id: initialData.category, name: initialData.category },
      ];
    }
    return DEFAULT_CATEGORIES;
  });

  const formMethods = useForm({
    defaultValues: buildDefaultValues(initialData),
  });

  const { watch } = formMethods;
  const watchedBarcode = watch("barcode");

  useEffect(() => {
    if (watchedBarcode?.trim()) {
      setBarcodeValue(watchedBarcode.trim());
    } else {
      setBarcodeValue("");
    }
  }, [watchedBarcode]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleAddCategory = (category) => {
    setCategories((prev) =>
      prev.some((c) => c.id === category.id) ? prev : [...prev, category]
    );
  };

  const buildProductPayload = (formData) => {
    const payload = {
      name: formData.name,
      code: formData.code,
      barcode: formData.barcode,
      category: formData.category,
      brand: formData.brand,
      unit: formData.unit,
      stock: Number(formData.initialStock) || 0,
      lowStockThreshold: Number(formData.lowStockThreshold) || 0,
      purchasePrice: Number(formData.purchasePrice) || 0,
      retailPrice: Number(formData.sellPrice1) || 0,
      wholesalePrice: Number(formData.sellPrice2) || 0,
      tax: Number(formData.vat) || 0,
    };

    // `null` یعنی «تصویر را پاک کن» — همان قراردادِ سند برای `imageUrl`.
    payload.imageUrl = imageUpload.imageKeyPayload;

    return payload;
  };

  return {
    formMethods,
    imageUpload,
    barcodeValue,
    categories,
    handleAddCategory,
    buildProductPayload,
  };
}