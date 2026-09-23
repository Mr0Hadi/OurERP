import axiosInstance from "@/shared/services/api/axios";

/**
 * دسترسی‌های یک کاربر برای صفحه‌ی ویرایش — `GetUserPermissions`:
 *
 *   { userId, fullName,
 *     permissions: [{ permission, name, title, grantedAt, grantedByFullName }],
 *     permissionGroups: [{ group, groupTitle, permissions: [{ permission, name, title }] }] }
 *
 * `permissionGroups` کاتالوگی است که *درخواست‌دهنده* اجازه‌ی دیدنش را دارد،
 * نه کلِ enum؛ چک‌باکس‌ها همیشه از همین ساخته می‌شوند و هیچ‌جا هاردکد نیستند.
 */
export async function getUserPermissions(userId) {
  const { data } = await axiosInstance.get("/Permission/GetUserPermissions", {
    params: { userId },
  });
  return data;
}

/**
 * جایگزینیِ کامل — `permissions` لیستِ *نهایی* (اعداد) است و آرایه‌ی خالی
 * یعنی همه گرفته شود. پاسخ: `{ userId, addedCount, removedCount }`.
 */
export async function updateUserPermissions({ userId, permissions }) {
  const { data } = await axiosInstance.put(
    "/Permission/UpdateUserPermissions",
    { userId: Number(userId), permissions },
  );
  return data;
}

/**
 * الگوی پیشنهادیِ یک واحد — `GetDepartmentPermissionTemplate`:
 *
 *   { departmentId, departmentName, permissions, permissionNames, permissionGroups }
 *
 * الگو هیچ دسترسی‌ای نمی‌دهد؛ فقط به ادمین پیشنهاد می‌شود.
 */
export async function getDepartmentPermissionTemplate(departmentId) {
  const { data } = await axiosInstance.get(
    "/Permission/GetDepartmentPermissionTemplate",
    { params: { departmentId } },
  );
  return data;
}

/** جایگزینیِ کاملِ الگوی واحد. پاسخ: `{ departmentId, addedCount, removedCount }`. */
export async function updateDepartmentPermissionTemplate({
  departmentId,
  permissions,
}) {
  const { data } = await axiosInstance.put(
    "/Permission/UpdateDepartmentPermissionTemplate",
    { departmentId: Number(departmentId), permissions },
  );
  return data;
}
