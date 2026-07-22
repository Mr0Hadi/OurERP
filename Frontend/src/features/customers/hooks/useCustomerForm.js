// src/features/customers/hooks/useCustomerForm.js
import { useState } from "react";
import { useForm } from "react-hook-form";

function buildDefaultValues(data) {
  if (!data) {
    return {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      lat: "",
      lng: "",
      postalCode: "",
      referralCode: "",
      creditLimit: "",
      Description: "",
      balanceType: "none",
      balanceAmount: "",
      image: null,
    };
  }

  return {
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    phone: data.phone || "",
    address: data.address || "",
    lat: data.coordinates?.lat?.toString() || "",
    lng: data.coordinates?.lng?.toString() || "",
    postalCode: data.postalCode || "",
    referralCode: data.referralCode || "",
    creditLimit: data.creditLimit?.toString() || "",
    Description: data.Description || "",
    balanceType: data.balanceType || "none",
    balanceAmount:
      data.balanceType && data.balanceType !== "none"
        ? Math.abs(data.balance || 0).toString()
        : "",
    image: null,
  };
}

export function buildCustomerPayload(data, imagePreview, existingImage) {
  const amount = Number(data.balanceAmount) || 0;
  const balanceType = data.balanceType || "none";
  const balance = balanceType === "none" ? 0 : Math.abs(amount);

  return {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone || null,
    address: data.address || null,
    postalCode: data.postalCode || null,
    referralCode: data.referralCode || "",
    creditLimit: data.creditLimit ? Number(data.creditLimit) : 0,
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

export function useCustomerForm(initialData = null) {
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
    reader.onloadend = () => setImagePreview(reader.result);
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
    buildCustomerPayload: (data) =>
      buildCustomerPayload(data, imagePreview, imageRemoved ? null : initialData?.image),
  };
}