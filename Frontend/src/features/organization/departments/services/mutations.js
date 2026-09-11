import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { createDepartment, updateDepartment, deleteDepartment } from "./api-v1";
import { departmentKeys } from "./queryKeys";
import { teamKeys } from "../../teams/services/queryKeys";
import { employeeKeys } from "@/features/employees/services/queryKeys";
import { authKeys } from "@/features/auth/services/queryKeys";

/**
 * تعیینِ مسئول/جانشینِ واحد کارمند را جابه‌جا می‌کند: واحدش عوض می‌شود،
 * از تیمش خارج می‌شود و نقشِ قبلی‌اش آزاد می‌شود. پس فهرستِ کارمندان،
 * تیم‌ها (مسئول و تعدادِ اعضا) و نشستِ کاربرِ جاری همه باید تازه شوند.
 */
function invalidateOrgChart(queryClient) {
  queryClient.invalidateQueries({ queryKey: departmentKeys.all });
  queryClient.invalidateQueries({ queryKey: teamKeys.all });
  queryClient.invalidateQueries({ queryKey: employeeKeys.all });
  queryClient.invalidateQueries({ queryKey: authKeys.session() });
}

export function useCreateDepartmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      toast.success("واحد جدید با موفقیت ثبت شد.");
      invalidateOrgChart(queryClient);
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت واحد"),
  });
}

export function useUpdateDepartmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDepartment,
    onSuccess: () => {
      toast.success("اطلاعات واحد با موفقیت ویرایش شد.");
      invalidateOrgChart(queryClient);
    },
    onError: (error) => toast.error(error?.message || "خطا در ویرایش واحد"),
  });
}

export function useDeleteDepartmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: (_, id) => {
      toast.success("واحد با موفقیت حذف شد.");
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      queryClient.invalidateQueries({ queryKey: departmentKeys.detail(id) });
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف واحد"),
  });
}
