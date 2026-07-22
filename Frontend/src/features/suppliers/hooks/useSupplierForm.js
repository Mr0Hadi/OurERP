// src/features/suppliers/hooks/useSupplierForm.js
import { useState } from "react";
import { useForm } from "react-hook-form";

function buildDefaultValues(data) {
  if (!data) {
    return {
      companyName: "",
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      lat: "",
      lng: "",
      postalCode: "",
      Description: "",
      balanceType: "none",
      balanceAmount: "",
      image: null,
    };
  }

  return {
    companyName: data.companyName || "",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    phone: data.phone || "",
    address: data.address || "",
    lat: data.coordinates?.lat?.toString() || "",
    lng: data.coordinates?.lng?.toString() || "",
    postalCode: data.postalCode || "",
    Description: data.Description || "",
    balanceType: data.balanceType || "none",
    balanceAmount:
      data.balanceType && data.balanceType !== "none"
        ? Math.abs(data.balance || 0).toString()
        : "",
    image: null,
  };
}

export function buildSupplierPayload(data, imagePreview, existingImage) {
  const amount = Number(data.balanceAmount) || 0;
  const balanceType = data.balanceType || "none";
  const balance = balanceType === "none" ? 0 : Math.abs(amount);

  return {
    companyName: data.companyName,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    phone: data.phone || null,
    address: data.address || null,
    postalCode: data.postalCode || null,
    Description: data.Description || "",
    balance,
    balanceType,
    image: imagePreview ?? existingImage ?? null,
    coordinates: {
      lat: data.lat ? parseFloat(data.lat) : null,
      lng: data.lng ? parseFloat(data.lng) : null,
    },
  };
}

export function useSupplierForm(initialData = null) {
  const [imagePreview, setImagePreview] = useState(initialData?.image || null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const formMethods = useForm({
    defaultValues: buildDefaultValues(initialData),
  });

  const { watch } = formMethods;
  const balanceType = watch("balanceType");

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageRemoved(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageRemoved(true);
    formMethods.setValue("image", null);
  };

  return {
    formMethods,
    balanceType,
    imagePreview,
    handleImageChange,
    handleRemoveImage,
    buildSupplierPayload: (data) =>
      buildSupplierPayload(data, imagePreview, imageRemoved ? null : initialData?.image),
  };
}