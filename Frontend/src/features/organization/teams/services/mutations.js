// src/features/organization/teams/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { createTeam, updateTeam, deleteTeam } from "./api-mockData";
import { teamKeys } from "./queryKeys";
import { departmentKeys } from "../../departments/services/queryKeys";

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
    },
    onError: (error) => toast.error(error?.message || "خطا در ویرایش تیم"),
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
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف تیم"),
  });
}
