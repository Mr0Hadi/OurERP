// src/shared/domain/permissions/effectivePermissions.js
import { OrgPositionEnum } from "@/shared/domain/enums/orgPosition";
import { permissionIdsToKeys } from "./permissionCatalog";

/**
 * دسترسیِ مؤثرِ یک کارمند = دسترسیِ «همه‌ی اعضای واحد» + (اگر مدیر یا
 * معاونِ واحد/تیمش باشد) دسترسیِ اضافه‌ی «مدیریت».
 *
 * چرا دو سطح روی خودِ واحد، نه یک لیستِ تخت: چون درخواستِ اصلی همین
 * بود — «دسترسی‌ها بر اساس واحد کاری *و جایگاهشان در واحد*». یک عضوِ
 * عادیِ واحد فروش باید بتواند فروش ثبت کند؛ مدیرِ همان واحد باید
 * علاوه بر آن بتواند مثلاً گزارش مالی هم ببیند. اگر این دو یک سطح
 * بودند، یا عضو عادی دسترسیِ مدیریتی می‌گرفت یا مدیر مجبور بود جدا از
 * واحدش یک نقش دیگر هم داشته باشد.
 *
 * ورودی purposely کمینه است (فقط دو آرایه‌ی id) تا این تابع به شکلِ
 * دقیقِ رکوردِ `Department` وابسته نباشد — چه از mock بیاید چه از سرور.
 */
export function effectivePermissionIds({
  memberPermissionIds = [],
  managerPermissionIds = [],
  position = OrgPositionEnum.MEMBER,
}) {
  const isManager =
    position === OrgPositionEnum.HEAD || position === OrgPositionEnum.DEPUTY;

  const ids = new Set(memberPermissionIds);
  if (isManager) {
    for (const id of managerPermissionIds) ids.add(id);
  }
  return [...ids];
}

/** همان تابع بالا، ولی خروجی‌اش کلیدهای رشته‌ای است — چیزی که منو می‌خواهد. */
export function effectivePermissionKeys(args) {
  return permissionIdsToKeys(effectivePermissionIds(args));
}
