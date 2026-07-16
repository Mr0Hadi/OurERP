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
      nationalId: "",
      type: "retail",
      customerGrade: "1",
      referralCode: "",
      creditLimit: "",
      balanceType: "none",
      openingBalance: "",
      notes: "",
      avatar: null,
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
    nationalId: data.nationalId || "",
    type: data.type || "retail",
    customerGrade: (data.customerGrade ?? 1).toString(),
    referralCode: data.referralCode || "",
    creditLimit: data.creditLimit?.toString() || "",
    balanceType: data.balanceType || "none",
    openingBalance: data.openingBalance?.toString() || "",
    notes: data.notes || "",
    avatar: null,
  };
}

export function buildCustomerPayload(data, avatarPreview, existingAvatar) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone || null,
    address: data.address || null,
    postalCode: data.postalCode || null,
    nationalId: data.nationalId || null,
    type: data.type || "retail",
    customerGrade: parseInt(data.customerGrade) || 1,
    referralCode: data.referralCode || null,
    creditLimit: parseFloat(data.creditLimit) || 0,
    balanceType: data.balanceType || "none",
    openingBalance: parseFloat(data.openingBalance) || 0,
    notes: data.notes || null,
    avatar: avatarPreview ?? existingAvatar ?? null,
    coordinates: {
      lat: data.lat ? parseFloat(data.lat) : null,
      lng: data.lng ? parseFloat(data.lng) : null,
    },
  };
}

export function useCustomerForm(initialData = null) {
  const [avatarPreview, setAvatarPreview] = useState(
    initialData?.avatar || null
  );
   const [avatarRemoved, setAvatarRemoved] = useState(false);

  const formMethods = useForm({
    defaultValues: buildDefaultValues(initialData),
  });

  const { watch } = formMethods;
  const balanceType = watch("balanceType");

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarRemoved(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarRemoved(true);
    formMethods.setValue("avatar", null);
  };

  return {
    formMethods,
    balanceType,
    avatarPreview,
    handleAvatarChange,
    handleRemoveAvatar,
    buildCustomerPayload: (data) =>
      buildCustomerPayload(data, avatarPreview, avatarRemoved ? null : initialData?.avatar),
  };
}
