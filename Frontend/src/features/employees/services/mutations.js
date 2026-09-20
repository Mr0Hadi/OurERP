import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
  createUser,
  updateUser,
  changeUserTeam,
  logoutUserById,
} from "./api-v1";
import { userKeys } from "./queryKeys";
import { teamKeys } from "@/features/organization/teams/services/queryKeys";
import { departmentKeys } from "@/features/organization/departments/services/queryKeys";
import { authKeys } from "@/features/auth/services/queryKeys";

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success("کارمند جدید با موفقیت ثبت شد.");
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      // شمارنده‌ی اعضای واحد و تیم عوض شده است.
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت کارمند");
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // سرور کل رکورد را بازنویسی می‌کند، پس payload شامل همه‌ی فیلدهاست
    // — نه فقط آن‌هایی که تغییر کرده‌اند.
    mutationFn: updateUser,
    onSuccess: (_, variables) => {
      toast.success("اطلاعات کارمند با موفقیت ویرایش شد.");
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      // اگر کارمندِ ویرایش‌شده خودِ کاربرِ واردشده باشد، `useUserInfoQuery`
      // (که دیگه staleTime:0 نداره) باید همین‌جا دستی تازه بشه.
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ویرایش کارمند");
    },
  });
}

/**
 * افزودن، خارج‌کردن و تعیینِ مسئول/جانشینِ تیم در صفحه‌ی جزئیات تیم — روی
 * `ChangeUserTeam` سرور.
 *
 * پیام موفقیت را خودِ صفحه تعیین می‌کند (`successMessage` در متغیرها)،
 * چون همین یک دستور هر سه کار را انجام می‌دهد و پیامِ خنثای «ویرایش شد»
 * به کاربر نمی‌گوید کدام اتفاق افتاد.
 */
export function useChangeUserTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeUserTeam,
    onSuccess: (_, variables) => {
      toast.success(variables.successMessage || "عضویت کارمند به‌روزرسانی شد.");
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در تغییر عضویت کارمند");
    },
  });
}

/** خروج اجباری از همه‌ی سشن‌ها — بدون تغییر در خودِ حساب. */
export function useLogoutUserByIdMutation() {
  return useMutation({
    mutationFn: logoutUserById,
    onSuccess: () => {
      toast.success("کارمند از تمام دستگاه‌ها خارج شد.");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در خروج اجباری کارمند");
    },
  });
}
