// src/features/organization/teams/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
  createTeam,
  updateTeam,
  assignTeamToDepartment,
  deleteTeam,
} from "./api-v1";
import { teamKeys } from "./queryKeys";
import { departmentKeys } from "../../departments/services/queryKeys";
import { employeeKeys } from "@/features/employees/services/queryKeys";

export function useCreateTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      toast.success("تیم جدید با موفقیت ثبت شد.");
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      // شمارنده‌ی تیم‌های واحد عوض شده است.
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت تیم"),
  });
}

export function useUpdateTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTeam,
    onSuccess: (_, variables) => {
      toast.success("اطلاعات تیم با موفقیت ویرایش شد.");
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      // با تغییر واحدِ تیم، واحدِ اعضایش هم عوض می‌شود.
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
    onError: (error) => toast.error(error?.message || "خطا در ویرایش تیم"),
  });
}

/**
 * افزودنِ یک تیمِ موجود به یک واحد (از صفحه‌ی جزئیات واحد).
 *
 * جدا از `useUpdateTeamMutation` است چون پیام و نقطه‌ی شروعش فرق دارد:
 * اینجا کاربر «تیم را به واحد اضافه» می‌کند، نه «تیم را ویرایش».
 */
export function useAssignTeamToDepartmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignTeamToDepartment,
    onSuccess: () => {
      toast.success("تیم به این واحد اضافه شد.");
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      // اعضای تیم همراهش جابه‌جا می‌شوند، پس واحدِ کارمندها هم عوض شده.
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
    onError: (error) => toast.error(error?.message || "خطا در افزودن تیم به واحد"),
  });
}

export function useDeleteTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTeam,
    onSuccess: (_, id) => {
      toast.success("تیم با موفقیت حذف شد.");
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      // عضویتِ اعضای تیمِ حذف‌شده باز می‌شود.
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف تیم"),
  });
}
