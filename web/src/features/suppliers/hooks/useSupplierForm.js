// src/features/suppliers/hooks/useSupplierForm.js
import { useState } from "react";
import { useForm } from "react-hook-form";

function buildDefaultValues(data) {
  if (!data) {
    return {
      companyName: "",
      contactPerson: "",
      phone: "",
      address: "",
      lat: "",
      lng: "",
      postalCode: "",
      balanceType: "none",
      balanceAmount: "",
      avatar: null,
    };
  }

  let balanceType = "none",
    balanceAmount = "";
  if (data.balance < 0) {
    balanceType = "debtor";
    balanceAmount = Math.abs(data.balance).toString();
  } else if (data.balance > 0) {
    balanceType = "creditor";
    balanceAmount = Math.abs(data.balance).toString();
  }

  return {
    companyName: data.companyName || "",
    contactPerson: data.contactPerson || "",
    phone: data.phone || "",
    address: data.address || "",
    lat: data.coordinates?.lat?.toString() || "",
    lng: data.coordinates?.lng?.toString() || "",
    postalCode: data.postalCode || "",
    balanceType,
    balanceAmount,
    avatar: null,
  };
}

export function buildSupplierPayload(data, avatarPreview, existingAvatar) {
  const amount = Number(data.balanceAmount) || 0;
  let balance = 0;
  if (data.balanceType === "debtor") balance = -Math.abs(amount);
  else if (data.balanceType === "creditor") balance = Math.abs(amount);

  return {
    companyName: data.companyName,
    contactPerson: data.contactPerson || null,
    phone: data.phone || null,
    address: data.address || null,
    postalCode: data.postalCode || null,
    balance,
    avatar: avatarPreview ?? existingAvatar ?? null,
    coordinates: {
      lat: data.lat ? parseFloat(data.lat) : null,
      lng: data.lng ? parseFloat(data.lng) : null,
    },
  };
}

export function useSupplierForm(initialData = null) {
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
    buildSupplierPayload: (data) =>
      buildSupplierPayload(data, avatarPreview, avatarRemoved ? null : initialData?.avatar),
  };
}
