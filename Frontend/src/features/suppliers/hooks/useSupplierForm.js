// src/features/suppliers/hooks/useSupplierForm.js
import { useForm } from "react-hook-form";
import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";
import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";
import { useImageUpload } from "@/shared/hooks/useImageUpload";

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
  };
}

/**
 * `imageKey` همان ObjectKey برگشته از `api/File/UploadImage` است و طبق
 * بخش ۱۷ سند در فیلد `imageUrl` می‌نشیند. `null` یعنی «تصویر را پاک کن».
 */
export function buildSupplierPayload(data, imageKey) {
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
    imageUrl: imageKey ?? null,
    // مختصات به‌صورت دو فیلد جدا و عددی ذخیره می‌شوند (نه یک آبجکت تودرتو)
    lat: data.lat !== "" && data.lat !== null && data.lat !== undefined ? parseFloat(data.lat) : null,
    lng: data.lng !== "" && data.lng !== null && data.lng !== undefined ? parseFloat(data.lng) : null,
  };
}

export function useSupplierForm(initialData = null) {
  const imageUpload = useImageUpload({
    folder: ImageFolderEnum.SUPPLIERS,
    initialKey: initialData?.imageKey ?? null,
    initialUrl: initialData?.imageUrl ?? null,
  });

  const formMethods = useForm({
    defaultValues: buildDefaultValues(initialData),
  });

  const { watch } = formMethods;
  const balanceType = watch("balanceType");

  return {
    formMethods,
    balanceType,
    imageUpload,
    buildSupplierPayload: (data) =>
      buildSupplierPayload(data, imageUpload.imageKeyPayload),
  };
}