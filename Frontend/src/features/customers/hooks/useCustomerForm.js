// src/features/customers/hooks/useCustomerForm.js
import { useForm } from "react-hook-form";
import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";
import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";
import { useImageUpload } from "@/shared/hooks/useImageUpload";

/**
 * فرمِ مشتری — فیلدهایش دقیقاً همان فیلدهای
 * `CreateCustomerCommand`/`UpdateCustomerCommand` هستند.
 *
 * چهار ناهماهنگی که اینجا رفع شد (هر چهار مورد *ساکت* بودند:
 * `System.Text.Json` فیلدِ ناشناس را بی‌صدا دور می‌ریزد، پس فرم سبز
 * می‌شد و مقدار هرگز ذخیره نمی‌شد):
 *
 * ۱. `phone` → سرور `PhoneNumber` می‌خواند. **شماره تماس مشتری اصلاً
 *    ذخیره نمی‌شد** — و این تنها راه تماس با مشتری است.
 * ۲. `lat`/`lng` → سرور `Latitude`/`Longitude` می‌خواند.
 * ۳. `referralCode` → ستون در بکند `RefferalCode` است (با غلط املایی).
 * ۴. پنج فیلدِ سرور اصلاً در فرم نبودند: کد اقتصادی، شناسه ملی، شماره
 *    ثبت، استان و شهر.
 *
 * همان کاری که یک دور قبل برای تامین‌کننده انجام شد؛ مشتری دو فیلدِ
 * ساکتِ بیشتر داشت.
 */

function buildDefaultValues(data) {
  if (!data) {
    return {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      address: "",
      postalCode: "",
      province: "",
      city: "",
      economicCode: "",
      nationalId: "",
      registrationNumber: "",
      latitude: "",
      longitude: "",
      referralCode: "",
      creditLimit: "",
      description: "",
      balanceType: BalanceTypeEnum.BALANCED,
      balanceAmount: "",
    };
  }

  const asText = (value) =>
    value !== null && value !== undefined ? String(value) : "";

  return {
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    phoneNumber: data.phoneNumber || "",
    address: data.address || "",
    postalCode: data.postalCode || "",
    province: data.province || "",
    city: data.city || "",
    economicCode: data.economicCode || "",
    nationalId: data.nationalId || "",
    registrationNumber: data.registrationNumber || "",
    latitude: asText(data.latitude),
    longitude: asText(data.longitude),
    // نامِ فیلدِ فرم املای درست را دارد؛ نگاشت به املای بکند فقط در
    // مرزِ payload انجام می‌شود (پایین‌تر).
    referralCode: data.refferalCode || "",
    creditLimit: asText(data.creditLimit),
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
export function buildCustomerPayload(data, imageKey) {
  const amount = Number(data.balanceAmount) || 0;
  const balanceType = data.balanceType ?? BalanceTypeEnum.BALANCED;
  const balance = balanceType === BalanceTypeEnum.BALANCED ? 0 : Math.abs(amount);

  return {
    firstName: data.firstName?.trim(),
    lastName: data.lastName?.trim(),
    phoneNumber: data.phoneNumber?.trim(),
    address: data.address?.trim(),
    postalCode: data.postalCode?.trim(),
    province: textOrNull(data.province),
    city: textOrNull(data.city),
    economicCode: textOrNull(data.economicCode),
    nationalId: textOrNull(data.nationalId),
    registrationNumber: textOrNull(data.registrationNumber),
    // غلطِ املاییِ عمدی: ستونِ بکند `RefferalCode` است. اگر روزی آنجا
    // اصلاح شد، فقط همین یک خط عوض می‌شود.
    refferalCode: textOrNull(data.referralCode),
    creditLimit: data.creditLimit ? Number(data.creditLimit) : 0,
    description: textOrNull(data.description),
    balance,
    balanceType,
    imageUrl: imageKey ?? null,
    latitude: numberOrNull(data.latitude),
    longitude: numberOrNull(data.longitude),
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
