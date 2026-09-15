import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { createTeam, updateTeam, deleteTeam } from "./api-v1";
import { teamKeys } from "./queryKeys";
import { departmentKeys } from "../../departments/services/queryKeys";
import { employeeKeys } from "@/features/employees/services/queryKeys";
import { authKeys } from "@/features/auth/services/queryKeys";

/**
 * تعیینِ مسئول/جانشینِ تیم کارمند را به تیم (و واحدش) منتقل می‌کند و
 * نقشِ قبلی‌اش را آزاد می‌کند — شاید مسئولیتِ همان واحد یا تیمِ دیگری. پس
 * همه‌ی نماهای چارت سازمانی و نشستِ کاربرِ جاری باید تازه شوند.
 */
function invalidateOrgChart(queryClient) {
  queryClient.invalidateQueries({ queryKey: teamKeys.all });
  queryClient.invalidateQueries({ queryKey: departmentKeys.all });
  queryClient.invalidateQueries({ queryKey: employeeKeys.all });
  queryClient.invalidateQueries({ queryKey: authKeys.session() });
}

export function useCreateTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      toast.success("تیم جدید با موفقیت ثبت شد.");
      invalidateOrgChart(queryClient);
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت تیم"),
  });
}

export function useUpdateTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTeam,
    onSuccess: () => {
      toast.success("اطلاعات تیم با موفقیت ویرایش شد.");
      invalidateOrgChart(queryClient);
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
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف تیم"),
  });
}
