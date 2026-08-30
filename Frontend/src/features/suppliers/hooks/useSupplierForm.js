// src/features/suppliers/hooks/useSupplierForm.js
import { useForm } from "react-hook-form";
import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";
import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";
import { useImageUpload } from "@/shared/hooks/useImageUpload";

/**
 * فرمِ تامین‌کننده — فیلدهایش دقیقاً همان فیلدهای
 * `CreateSupplierCommand`/`UpdateSupplierCommand` هستند.
 *
 * سه ناهماهنگی که اینجا رفع شد:
 *
 * ۱. مختصات با نام `lat`/`lng` فرستاده می‌شد ولی سرور `Latitude`/
 *    `Longitude` می‌خواند — یعنی موقعیتِ انتخاب‌شده روی نقشه هیچ‌وقت
 *    ذخیره نمی‌شد (System.Text.Json فیلدِ ناشناس را بی‌صدا دور می‌ریزد).
 * ۲. پنج فیلدِ سرور اصلاً در فرم نبودند: کد اقتصادی، شناسه/کد ملی،
 *    شماره ثبت، استان و شهر.
 * ۳. فیلدهای اجباریِ سرور در فرم اختیاری بودند و به‌جای `""` مقدارِ
 *    `null` می‌گرفتند؛ نتیجه‌اش خطای ۴۰۰ بعد از پر کردنِ کلِ فرم بود.
 */

function buildDefaultValues(data) {
  if (!data) {
    return {
      companyName: "",
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      postalCode: "",
      province: "",
      city: "",
      economicCode: "",
      nationalId: "",
      registrationNumber: "",
      latitude: "",
      longitude: "",
      description: "",
      balanceType: BalanceTypeEnum.BALANCED,
      balanceAmount: "",
    };
  }

  const asText = (value) =>
    value !== null && value !== undefined ? String(value) : "";

  return {
    companyName: data.companyName || "",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    phone: data.phone || "",
    address: data.address || "",
    postalCode: data.postalCode || "",
    province: data.province || "",
    city: data.city || "",
    economicCode: data.economicCode || "",
    nationalId: data.nationalId || "",
    registrationNumber: data.registrationNumber || "",
    latitude: asText(data.latitude),
    longitude: asText(data.longitude),
    description: data.description || "",
    balanceType: data.balanceType ?? BalanceTypeEnum.BALANCED,
    balanceAmount:
      data.balanceType !== undefined && data.balanceType !== BalanceTypeEnum.BALANCED
        ? Math.abs(data.balance || 0).toString()
        : "",
  };
}

const numberOrNull = (value) =>
  value !== "" && value !== null && value !== undefined
    ? parseFloat(value)
    : null;

/** فیلدهای اختیاری خالی به‌جای `""` مقدار `null` می‌گیرند — ستون‌ها nullable اند. */
const textOrNull = (value) => {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
};

/**
 * `imageKey` همان ObjectKey برگشته از `api/File/UploadImage` است و در
 * فیلد `imageUrl` می‌نشیند (نامِ فیلد در خودِ Command همین است؛ سرور
 * هنگام ذخیره آن را به کلید نرمال می‌کند). `null` یعنی «تصویر را پاک کن».
 */
export function buildSupplierPayload(data, imageKey) {
  const amount = Number(data.balanceAmount) || 0;
  const balanceType = data.balanceType ?? BalanceTypeEnum.BALANCED;
  const balance = balanceType === BalanceTypeEnum.BALANCED ? 0 : Math.abs(amount);

  return {
    companyName: data.companyName?.trim(),
    firstName: data.firstName?.trim(),
    lastName: data.lastName?.trim(),
    phone: data.phone?.trim(),
    address: data.address?.trim(),
    postalCode: data.postalCode?.trim(),
    province: textOrNull(data.province),
    city: textOrNull(data.city),
    economicCode: textOrNull(data.economicCode),
    nationalId: textOrNull(data.nationalId),
    registrationNumber: textOrNull(data.registrationNumber),
    description: textOrNull(data.description),
    balance,
    balanceType,
    imageUrl: imageKey ?? null,
    latitude: numberOrNull(data.latitude),
    longitude: numberOrNull(data.longitude),
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
