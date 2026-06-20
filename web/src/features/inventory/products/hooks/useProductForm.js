// src/features/inventory/products/hooks/useProductForm.js
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

const DEFAULT_CATEGORIES = [
  { id: "موتور", name: "موتور" },
  { id: "سیستم ترمز", name: "سیستم ترمز" },
  { id: "سیستم تعلیق", name: "سیستم تعلیق" },
  { id: "برق و روشنایی", name: "برق و روشنایی" },
  { id: "بدنه", name: "بدنه" },
  { id: "گیربکس", name: "گیربکس" },
  { id: "سیستم خنک کننده", name: "سیستم خنک کننده" },
];

const DEFAULT_FORM_VALUES = {
  name: "",
  code: "",
  barcode: "",
  category: "",
  brand: "",
  unit: "عدد",
  initialStock: 0,
  purchasePrice: 0,
  sellPrice1: 0,
  sellPrice2: 0,
  vat: 0,
};

export function useProductForm(initialData = null) {
  const [imagePreview, setImagePreview] = useState(null);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  
  const prevDataRef = useRef();

  const formMethods = useForm({
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const { setValue, watch } = formMethods;
  const watchedBarcode = watch("barcode");

  useEffect(() => {
    if (initialData && initialData !== prevDataRef.current) {
      // اگر دسته‌بندی محصول در لیست نیست، اضافه‌اش کن
      if (initialData.category) {
        const categoryExists = categories.some(cat => cat.id === initialData.category);
        if (!categoryExists) {
          setCategories(prev => [
            ...prev,
            { id: initialData.category, name: initialData.category }
          ]);
        }
      }

      setValue("name", initialData.name || "");
      setValue("code", initialData.code || "");
      setValue("barcode", initialData.barcode || "");
      setValue("category", initialData.category || "");
      setValue("brand", initialData.brand || "");
      setValue("unit", initialData.unit || "عدد");
      setValue("initialStock", initialData.stock || initialData.initialStock || 0);
      setValue("purchasePrice", initialData.purchasePrice || 0);
      setValue("sellPrice1", initialData.retailPrice || initialData.sellPrice1 || 0);
      setValue("sellPrice2", initialData.wholesalePrice || initialData.sellPrice2 || 0);
      setValue("vat", initialData.tax || initialData.vat || 0);

      if (initialData.imageUrl) setImagePreview(initialData.imageUrl);
      if (initialData.barcode) setBarcodeValue(initialData.barcode);

      prevDataRef.current = initialData;
    }
  }, [initialData, setValue, categories]);

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

  const handleAddCategory = (newCategory) => {
    setCategories(prev => [...prev, newCategory]);
    setValue("category", newCategory.id);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return {
    formMethods,
    imagePreview,
    barcodeValue,
    categories,
    handleAddCategory,
    handleImageChange,
  };
}
