// src/features/inventory/products/hooks/useProductForm.js
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

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
    unit: data.unit || "",
    initialStock: data.stock ?? data.initialStock ?? 0,
    purchasePrice: data.purchasePrice || 0,
    sellPrice1: data.retailPrice ?? data.sellPrice1 ?? 0,
    sellPrice2: data.wholesalePrice ?? data.sellPrice2 ?? 0,
    vat: data.tax ?? data.vat ?? 0,
  };
}

export function useProductForm(initialData = null) {
  const [imagePreview, setImagePreview] = useState(
    initialData?.imageUrl || null
  );
  const [barcodeValue, setBarcodeValue] = useState(initialData?.barcode || "");
  const [categories] = useState(() => {
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
    defaultValues: buildDefaultValues(initialData), // initialData حالا همیشه مقدار داره
  });

  const {watch } = formMethods;
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


  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return {
    formMethods,
    imagePreview,
    barcodeValue,
    categories,
    handleImageChange,
  };
}
