import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
  updateDepartmentPermissionTemplate,
  updateUserPermissions,
} from "./api-v1";
import { permissionKeys } from "./queryKeys";
import { authKeys } from "@/features/auth/services/queryKeys";

const toFa = (n) => Number(n ?? 0).toLocaleString("fa-IR");

/** «۳ دسترسی اضافه و ۱ دسترسی حذف شد» — از پاسخِ `{ addedCount, removedCount }`. */
function changeSummary({ addedCount, removedCount } = {}) {
  if (!addedCount && !removedCount) return "تغییری ثبت نشد.";
  const parts = [];
  if (addedCount) parts.push(`${toFa(addedCount)} دسترسی اضافه`);
  if (removedCount) parts.push(`${toFa(removedCount)} دسترسی حذف`);
  return `${parts.join(" و ")} شد.`;
}

export function useUpdateUserPermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserPermissions,
    onSuccess: (data, variables) => {
      toast.success(changeSummary(data));
      queryClient.invalidateQueries({
        queryKey: permissionKeys.user(variables.userId),
      });
      // اگر ادمین دسترسی‌های *خودش* را عوض کرده باشد، منو و گاردِ مسیرِ
      // خودش باید همین حالا تازه شوند نه بعد از `staleTime`. تشخیصِ «خودش»
      // لازم نیست؛ یک درخواستِ اضافه ارزان‌تر از منوی کهنه است.
      queryClient.invalidateQueries({ queryKey: authKeys.myPermissions() });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دسترسی‌ها");
    },
  });
}

export function useUpdateDepartmentPermissionTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDepartmentPermissionTemplate,
    onSuccess: (data, variables) => {
      toast.success(`الگوی واحد ذخیره شد؛ ${changeSummary(data)}`);
      queryClient.invalidateQueries({
        queryKey: permissionKeys.template(variables.departmentId),
      });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت الگوی دسترسی واحد");
    },
  });
}
