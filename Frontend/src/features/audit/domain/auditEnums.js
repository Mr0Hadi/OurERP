import { FilePlus2, FilePen, FileX2 } from "lucide-react";

/** `AuditOperationEnum`ِ بکند — نوعِ تغییرِ یک سطر. */
export const AuditOperationEnum = Object.freeze({
  INSERT: 1,
  UPDATE: 2,
  DELETE: 3,
});

export const AUDIT_OPERATION_LABELS = Object.freeze({
  [AuditOperationEnum.INSERT]: "ایجاد",
  [AuditOperationEnum.UPDATE]: "ویرایش",
  [AuditOperationEnum.DELETE]: "حذف",
});

export const AUDIT_OPERATION_TONES = Object.freeze({
  [AuditOperationEnum.INSERT]: "success",
  [AuditOperationEnum.UPDATE]: "info",
  [AuditOperationEnum.DELETE]: "danger",
});

export const AUDIT_OPERATION_ICONS = Object.freeze({
  [AuditOperationEnum.INSERT]: FilePlus2,
  [AuditOperationEnum.UPDATE]: FilePen,
  [AuditOperationEnum.DELETE]: FileX2,
});

/**
 * گروهِ هر عملیات از روی عددش (`AuditActionEnum` در بکند بازه‌بندی شده: ۱–۱۹ نشست، ۲۰–۹۹
 * کاربران و سازمان، ۱۰۰–۱۹۹ اطلاعاتِ پایه، ۲۰۰ خرید، ۳۰۰ مرجوعیِ خرید، ...). فقط برای رنگ و
 * آیکنِ ردیف؛ متنِ عملیات همیشه `actionTitle`ِ سرور است.
 */
const ACTION_GROUPS = [
  { max: 19, label: "نشست", tone: "neutral" },
  { max: 99, label: "کاربران و سازمان", tone: "special" },
  { max: 199, label: "اطلاعات پایه", tone: "primary" },
  { max: 299, label: "خرید", tone: "info" },
  { max: 399, label: "مرجوعی خرید", tone: "caution" },
  { max: 499, label: "فروش", tone: "success" },
  { max: 599, label: "اقساط", tone: "success" },
  { max: 699, label: "مرجوعی فروش", tone: "caution" },
  { max: 799, label: "انبار", tone: "warning" },
  { max: 899, label: "دانه‌های کالا", tone: "warning" },
  { max: 999, label: "کارت‌خوان", tone: "primary" },
];

/** `{ label, tone }` برای یک عملیات؛ `null` (تغییرِ بیرون از هر کامند) خاکستری. */
export function actionGroupOf(action) {
  if (action == null) return { label: "سیستم", tone: "neutral" };
  return ACTION_GROUPS.find((group) => action <= group.max) ?? { label: "سایر", tone: "neutral" };
}

/** متنِ عملیات؛ سرور برای تغییرِ بیرون از هر کامند `action: null` می‌فرستد. */
export const actionTitleOf = (event) => event?.actionTitle || "تغییر سیستمی";
