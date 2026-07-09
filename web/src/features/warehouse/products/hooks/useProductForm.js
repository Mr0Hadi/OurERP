// src/features/warehouse/products/hooks/useProductForm.js
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
      reorderThreshold: 0,
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
    reorderThreshold: data.reorderThreshold ?? 0,
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
  const [imageFile, setImageFile] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
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

  const handleImageChange = (file) => {
    if (file) {
      setImageFile(file);
      setImageRemoved(false);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setImagePreview(null);
    setImageFile(null);
    setImageRemoved(true);
  };

  const buildProductPayload = (formData) => {
    const payload = {
      name: formData.name,
      code: formData.code,
      barcode: formData.barcode,
      category: formData.category,
      brand: formData.brand,
      unit: formData.unit,
      reorderThreshold: Number(formData.reorderThreshold) || 0,
      purchasePrice: Number(formData.purchasePrice) || 0,
      retailPrice: Number(formData.sellPrice1) || 0,
      wholesalePrice: Number(formData.sellPrice2) || 0,
      tax: Number(formData.vat) || 0,
    };

    if (imageRemoved) {
      payload.imageUrl = "";
    } else if (imageFile) {
      payload.imageUrl = imagePreview;
    } else if (initialData?.imageUrl) {
      payload.imageUrl = initialData.imageUrl;
    } else {
      payload.imageUrl = "";
    }

    return payload;
  };

  return {
    formMethods,
    imagePreview,
    imageFile,
    imageRemoved,
    barcodeValue,
    categories,
    handleImageChange,
    handleImageRemove,
    buildProductPayload,
  };
}
