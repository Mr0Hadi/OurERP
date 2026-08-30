// src/features/customers/hooks/useCustomerForm.js
import { useForm } from "react-hook-form";
import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";
import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";
import { useImageUpload } from "@/shared/hooks/useImageUpload";

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
      balanceType: BalanceTypeEnum.BALANCED,
      balanceAmount: "",
    };
  }

  return {
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    phone: data.phone || "",
    address: data.address || "",
    lat: data.lat !== null && data.lat !== undefined ? data.lat.toString() : "",
    lng: data.lng !== null && data.lng !== undefined ? data.lng.toString() : "",
    postalCode: data.postalCode || "",
    referralCode: data.referralCode || "",
    creditLimit: data.creditLimit?.toString() || "",
    Description: data.Description || "",
    balanceType: data.balanceType ?? BalanceTypeEnum.BALANCED,
    balanceAmount:
      data.balanceType !== undefined && data.balanceType !== BalanceTypeEnum.BALANCED
        ? Math.abs(data.balance || 0).toString()
        : "",
  };
}

/**
 * `imageKey` همان ObjectKey است که از `api/File/UploadImage` گرفته شده و
 * طبق بخش ۱۷ سند باید در فیلد `imageUrl` بنشیند — نه یک URL و نه base64.
 * `null` یعنی «تصویر را پاک کن».
 */
export function buildCustomerPayload(data, imageKey) {
  const amount = Number(data.balanceAmount) || 0;
  const balanceType = data.balanceType ?? BalanceTypeEnum.BALANCED;
  const balance = balanceType === BalanceTypeEnum.BALANCED ? 0 : Math.abs(amount);

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
    imageUrl: imageKey ?? null,
    // مختصات به‌صورت دو فیلد جدا و عددی ذخیره می‌شوند (نه یک آبجکت تودرتو)
    lat: data.lat !== "" && data.lat !== null && data.lat !== undefined ? parseFloat(data.lat) : null,
    lng: data.lng !== "" && data.lng !== null && data.lng !== undefined ? parseFloat(data.lng) : null,
  };
}

export function useCustomerForm(initialData = null) {
  // آپلود بلافاصله انجام می‌شود و فرم فقط کلیدش را نگه می‌دارد؛ منطقِ
  // پیش‌نمایش، پیشرفت و پاک‌سازیِ فایلِ یتیم همه در هوکِ مشترک است.
  const imageUpload = useImageUpload({
    folder: ImageFolderEnum.CUSTOMERS,
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
    buildCustomerPayload: (data) =>
      buildCustomerPayload(data, imageUpload.imageKeyPayload),
  };
}