import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { changePassword, updateUserInfo } from "./api-v1";
import { authKeys } from "./queryKeys";
import { useAuthStore } from "../store/authStore";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/**
 * تغییرِ رمزِ کاربرِ جاری. توکن‌های تازه‌ی پاسخ فوراً جای قبلی‌ها می‌نشینند و پرچمِ
 * «تغییرِ رمزِ اجباری» پاک می‌شود؛ پیامِ موفقیت با صفحه است (اجباری یا داوطلبانه).
 */
export function useChangePasswordMutation() {
  const passwordChanged = useAuthStore((s) => s.passwordChanged);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changePassword,
    onSuccess: (tokens) => {
      passwordChanged(tokens);
      // پیش از این شاید درخواست‌هایی با ۴۰۳ِ «تغییرِ رمزِ اجباری» شکست خورده باشند.
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "خطا در تغییر رمز عبور"));
    },
  });
}

/** ویرایشِ نامِ کاربرِ جاری؛ نامِ منوی کاربر و هر لیستی که او را نشان می‌دهد تازه می‌شود. */
export function useUpdateUserInfoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserInfo,
    onSuccess: () => {
      toast.success("اطلاعات شما ذخیره شد.");
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
      // لیستِ کارمندان (`userKeys.all`)؛ کلیدِ خامِ ریشه تا auth به employees وابسته نشود.
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "خطا در ذخیره‌ی اطلاعات"));
    },
  });
}
