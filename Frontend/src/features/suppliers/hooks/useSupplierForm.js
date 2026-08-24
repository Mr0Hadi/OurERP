// src/features/suppliers/hooks/useSupplierForm.js
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";

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
      balanceType: BalanceTypeEnum.BALANCED,
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
    lat: data.lat !== null && data.lat !== undefined ? data.lat.toString() : "",
    lng: data.lng !== null && data.lng !== undefined ? data.lng.toString() : "",
    postalCode: data.postalCode || "",
    Description: data.Description || "",
    balanceType: data.balanceType ?? BalanceTypeEnum.BALANCED,
    balanceAmount:
      data.balanceType !== undefined && data.balanceType !== BalanceTypeEnum.BALANCED
        ? Math.abs(data.balance || 0).toString()
        : "",
    image: null,
  };
}

export function buildSupplierPayload(data, imagePreview, existingImage) {
  const amount = Number(data.balanceAmount) || 0;
  const balanceType = data.balanceType ?? BalanceTypeEnum.BALANCED;
  const balance = balanceType === BalanceTypeEnum.BALANCED ? 0 : Math.abs(amount);

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
    // مختصات به‌صورت دو فیلد جدا و عددی ذخیره می‌شوند (نه یک آبجکت تودرتو)
    lat: data.lat !== "" && data.lat !== null && data.lat !== undefined ? parseFloat(data.lat) : null,
    lng: data.lng !== "" && data.lng !== null && data.lng !== undefined ? parseFloat(data.lng) : null,
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